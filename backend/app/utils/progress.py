"""
Utility functions for updating user progress
"""
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models


def update_daily_progress(db: Session, user_id: int, today: date = None) -> models.DailyProgress:
    """
    Update or create daily progress for a user
    """
    if today is None:
        today = date.today()

    daily_progress = db.query(models.DailyProgress).filter(
        models.DailyProgress.user_id == user_id,
        models.DailyProgress.date == today
    ).first()

    if not daily_progress:
        daily_progress = models.DailyProgress(
            user_id=user_id,
            date=today,
            practice_count=1
        )
        db.add(daily_progress)
    else:
        daily_progress.practice_count += 1

    return daily_progress


def update_activity_calendar(db: Session, user_id: int, today: date = None) -> models.ActivityCalendar:
    """
    Update or create activity calendar entry for a user
    """
    if today is None:
        today = date.today()

    activity = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == user_id,
        models.ActivityCalendar.date == today
    ).first()

    if not activity:
        activity = models.ActivityCalendar(
            user_id=user_id,
            date=today,
            practice_count=1
        )
        db.add(activity)
    else:
        activity.practice_count += 1

    return activity


def update_part_progress(db: Session, user_id: int, part: int) -> models.PartProgress:
    """
    Update or create part progress for a user
    """
    part_progress = db.query(models.PartProgress).filter(
        models.PartProgress.user_id == user_id,
        models.PartProgress.part == part
    ).first()

    if part_progress:
        part_progress.completed_count += 1
    else:
        # Get total count for this part
        total_count = db.query(func.count(models.Question.id)).filter(
            models.Question.part == part
        ).scalar() or 0
        part_progress = models.PartProgress(
            user_id=user_id,
            part=part,
            completed_count=1,
            total_count=total_count
        )
        db.add(part_progress)

    return part_progress


def update_streak(db: Session, user_id: int, today: date = None) -> models.Streak:
    """
    Update or create streak for a user
    """
    if today is None:
        today = date.today()

    streak = db.query(models.Streak).filter(
        models.Streak.user_id == user_id
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
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today
        )
        db.add(streak)

    return streak


def update_all_progress(db: Session, user_id: int, part: int, today: date = None):
    """
    Update all progress metrics for a user (daily, activity, part, streak)
    """
    if today is None:
        today = date.today()

    update_daily_progress(db, user_id, today)
    update_activity_calendar(db, user_id, today)
    update_part_progress(db, user_id, part)
    update_streak(db, user_id, today)
