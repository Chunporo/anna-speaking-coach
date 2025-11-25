from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()


@router.post("/", response_model=schemas.PracticeSessionResponse)
def create_practice_session(
    session: schemas.PracticeSessionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_session = models.PracticeSession(
        user_id=current_user.id,
        **session.model_dump()
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Update daily progress
    today = date.today()
    daily_progress = db.query(models.DailyProgress).filter(
        models.DailyProgress.user_id == current_user.id,
        models.DailyProgress.date == today
    ).first()
    
    if not daily_progress:
        daily_progress = models.DailyProgress(
            user_id=current_user.id,
            date=today,
            practice_count=1
        )
        db.add(daily_progress)
    else:
        daily_progress.practice_count += 1
    
    # Update activity calendar
    activity = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == current_user.id,
        models.ActivityCalendar.date == today
    ).first()
    
    if not activity:
        activity = models.ActivityCalendar(
            user_id=current_user.id,
            date=today,
            practice_count=1
        )
        db.add(activity)
    else:
        activity.practice_count += 1
    
    # Update part progress
    part_progress = db.query(models.PartProgress).filter(
        models.PartProgress.user_id == current_user.id,
        models.PartProgress.part == session.part
    ).first()
    
    if part_progress:
        part_progress.completed_count += 1
    else:
        # Get total count for this part
        total_count = db.query(func.count(models.Question.id)).filter(
            models.Question.part == session.part
        ).scalar() or 0
        part_progress = models.PartProgress(
            user_id=current_user.id,
            part=session.part,
            completed_count=1,
            total_count=total_count
        )
        db.add(part_progress)
    
    # Update streak
    streak = db.query(models.Streak).filter(
        models.Streak.user_id == current_user.id
    ).first()
    
    if streak:
        if streak.last_activity_date:
            days_diff = (today - streak.last_activity_date).days
            if days_diff == 1:
                streak.current_streak += 1
            elif days_diff > 1:
                streak.current_streak = 1
            # If days_diff == 0, same day, don't increment
        else:
            streak.current_streak = 1
        
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
        
        streak.last_activity_date = today
    else:
        streak = models.Streak(
            user_id=current_user.id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today
        )
        db.add(streak)
    
    db.commit()
    return db_session


@router.get("/", response_model=List[schemas.PracticeSessionResponse])
def get_practice_sessions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == current_user.id
    ).order_by(models.PracticeSession.created_at.desc()).all()

