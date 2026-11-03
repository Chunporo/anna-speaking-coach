from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()


@router.post("/", response_model=schemas.MockTestResponse)
def create_mock_test(
    test: schemas.MockTestCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_test = models.MockTest(
        user_id=current_user.id,
        test_type=test.test_type
    )
    parts = [1, 2, 3] if test.test_type == 'FULL' else [int(test.test_type[-1])]
    selected = []
    for part in parts:
        questions = db.query(models.Question).filter_by(part=part).order_by(func.random()).limit(1 if part == 2 else 3).all()
        if not questions:
            raise HTTPException(status_code=409, detail=f'No questions available for Part {part}')
        selected.extend(questions)
    db.add(db_test)
    db.flush()
    for index, question in enumerate(selected):
        db.add(models.MockTestQuestion(mock_test_id=db_test.id, question_id=question.id, part=question.part, order_index=index))
    db.commit()
    db.refresh(db_test)
    return db_test


@router.get("/", response_model=List[schemas.MockTestResponse])
def get_mock_tests(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.MockTest).filter(
        models.MockTest.user_id == current_user.id
    ).order_by(models.MockTest.created_at.desc()).all()


@router.get("/{test_id}", response_model=schemas.MockTestResponse)
def get_mock_test(
    test_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    test = db.query(models.MockTest).filter(
        models.MockTest.id == test_id,
        models.MockTest.user_id == current_user.id
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test



@router.get('/{test_id}/questions')
def test_questions(test_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    get_mock_test(test_id, current_user, db)
    rows = db.query(models.MockTestQuestion).filter_by(mock_test_id=test_id).order_by(models.MockTestQuestion.order_index).all()
    if not rows:
        raise HTTPException(status_code=409, detail='This older test has no questions. Please start a new test.')
    if any(row.question_id is None for row in rows):
        raise HTTPException(status_code=409, detail='A question in this test was removed. Please start a new test.')
    return [dict(id=row.id, question_id=row.question_id, part=row.part,
                 question_text=db.get(models.Question, row.question_id).question_text,
                 answered=row.audio_url is not None) for row in rows]


from pydantic import BaseModel

class TestAnswer(BaseModel):
    session_id: int


@router.post('/{test_id}/answers/{question_id}')
def submit_answer(test_id: int, question_id: int, answer: TestAnswer, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    test = db.query(models.MockTest).filter_by(id=test_id, user_id=current_user.id).with_for_update().first()
    if not test:
        raise HTTPException(status_code=404, detail='Test not found')
    question = db.query(models.MockTestQuestion).filter_by(mock_test_id=test_id, question_id=question_id).first()
    session = db.query(models.PracticeSession).filter_by(id=answer.session_id, user_id=current_user.id, question_id=question_id).first()
    if not question or not session or not session.audio_url:
        raise HTTPException(status_code=422, detail='Valid analyzed answer required')
    question.audio_url, question.transcription = session.audio_url, session.transcription
    db.flush()
    rows = db.query(models.MockTestQuestion).filter_by(mock_test_id=test_id).all()
    sessions = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == current_user.id,
        models.PracticeSession.audio_url.in_([row.audio_url for row in rows if row.audio_url]),
    ).all()
    for field in ['fluency_score', 'vocabulary_score', 'grammar_score', 'pronunciation_score']:
        values = [getattr(s, field) for s in sessions if getattr(s, field) is not None]
        setattr(test, field, sum(values) / len(values) if len(values) == len(rows) else None)
    complete = bool(rows) and all(row.audio_url for row in rows)
    test.feedback = 'Completed' if complete else f'{sum(bool(row.audio_url) for row in rows)}/{len(rows)} answers submitted'
    db.commit()
    return {'complete': complete}
