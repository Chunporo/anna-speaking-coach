from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()


@router.get("/", response_model=List[schemas.QuestionResponse])
def get_questions(
    part: Optional[int] = Query(None, ge=1, le=3),
    topic: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Question)
    if part:
        query = query.filter(models.Question.part == part)
    if topic:
        query = query.filter(models.Question.topic.ilike(f"%{topic}%"))
    return query.all()


@router.get("/topics", response_model=List[str])
def get_topics(part: Optional[int] = Query(None, ge=1, le=3), db: Session = Depends(get_db)):
    query = db.query(models.Question.topic).distinct()
    if part:
        query = query.filter(models.Question.part == part)
    return [topic[0] for topic in query.all()]


@router.get("/{question_id}", response_model=schemas.QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db)
):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.get("/user-questions", response_model=List[schemas.UserQuestionResponse])
def get_user_questions(
    part: Optional[int] = Query(None, ge=1, le=3),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.UserQuestion).filter(models.UserQuestion.user_id == current_user.id)
    if part:
        query = query.filter(models.UserQuestion.part == part)
    return query.all()


@router.post("/user-questions", response_model=schemas.UserQuestionResponse)
def create_user_question(
    question: schemas.UserQuestionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_question = models.UserQuestion(
        user_id=current_user.id,
        **question.model_dump()
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


@router.delete("/user-questions/{question_id}")
def delete_user_question(
    question_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    question = db.query(models.UserQuestion).filter(
        models.UserQuestion.id == question_id,
        models.UserQuestion.user_id == current_user.id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
    return {"message": "Question deleted"}

