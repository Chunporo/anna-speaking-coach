from typing import List
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()


@router.get("/daily", response_model=schemas.DailyProgressResponse)
def get_daily_progress(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    daily_progress = db.query(models.DailyProgress).filter(
        models.DailyProgress.user_id == current_user.id,
        models.DailyProgress.date == today
    ).first()
    
    if not daily_progress:
        daily_progress = models.DailyProgress(
            user_id=current_user.id,
            date=today,
            practice_count=0,
            target_count=25
        )
        db.add(daily_progress)
        db.commit()
        db.refresh(daily_progress)
    
    return daily_progress


@router.get("/streak", response_model=schemas.StreakResponse)
def get_streak(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    streak = db.query(models.Streak).filter(
        models.Streak.user_id == current_user.id
    ).first()
    
    if not streak:
        streak = models.Streak(user_id=current_user.id)
        db.add(streak)
        db.commit()
        db.refresh(streak)
    
    return streak


@router.get("/activity-calendar", response_model=List[schemas.ActivityCalendarResponse])
def get_activity_calendar(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Get last 6 months of activity
    six_months_ago = date.today() - timedelta(days=180)
    activities = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == current_user.id,
        models.ActivityCalendar.date >= six_months_ago
    ).order_by(models.ActivityCalendar.date).all()
    
    return activities


@router.get("/part-progress", response_model=List[schemas.PartProgressResponse])
def get_part_progress(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    part_progresses = db.query(models.PartProgress).filter(
        models.PartProgress.user_id == current_user.id
    ).all()
    
    # If no progress exists, initialize with totals
    if not part_progresses:
        for part in [1, 2, 3]:
            total_count = db.query(func.count(models.Question.id)).filter(
                models.Question.part == part
            ).scalar() or 0
            part_progress = models.PartProgress(
                user_id=current_user.id,
                part=part,
                completed_count=0,
                total_count=total_count
            )
            db.add(part_progress)
        db.commit()
        part_progresses = db.query(models.PartProgress).filter(
            models.PartProgress.user_id == current_user.id
        ).all()
    
    return part_progresses

