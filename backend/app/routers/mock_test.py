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
    db.add(db_test)
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

