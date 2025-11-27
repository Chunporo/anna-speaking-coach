from typing import List
from datetime import date, timedelta, datetime
from calendar import monthrange, month_name
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
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
            target_count=10
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


@router.get("/streak-analytics", response_model=schemas.StreakAnalyticsResponse)
def get_streak_analytics(
    year: int = Query(None),
    month: int = Query(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive streak analytics including calendar, charts, and statistics."""
    today = date.today()
    target_year = year or today.year
    target_month = month or today.month
    
    # Get streak info
    streak = db.query(models.Streak).filter(
        models.Streak.user_id == current_user.id
    ).first()
    current_streak = streak.current_streak if streak else 0
    
    # Calculate calendar days for the month
    first_day = date(target_year, target_month, 1)
    last_day = date(target_year, target_month, monthrange(target_year, target_month)[1])
    
    # Get all activity for the month
    month_activities = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == current_user.id,
        models.ActivityCalendar.date >= first_day,
        models.ActivityCalendar.date <= last_day
    ).all()
    activity_dict = {act.date: act.practice_count for act in month_activities}
    
    # Build calendar days
    calendar_days = []
    for day in range(1, monthrange(target_year, target_month)[1] + 1):
        current_date = date(target_year, target_month, day)
        # Check if activity exists for this date
        has_activity = current_date in activity_dict and activity_dict[current_date] > 0
        calendar_days.append(schemas.CalendarDayResponse(
            date=current_date,
            has_activity=has_activity,
            practice_count=activity_dict.get(current_date, 0)
        ))
    
    # Get this month total
    this_month_total = sum(act.practice_count for act in month_activities)
    
    # Get total completions (all time)
    total_completions = db.query(func.sum(models.ActivityCalendar.practice_count)).filter(
        models.ActivityCalendar.user_id == current_user.id
    ).scalar() or 0
    
    # Calculate off days (days with no activity in current streak period)
    off_days = 0
    if streak and streak.last_activity_date:
        # Count days since last activity that have no activity
        days_since = (today - streak.last_activity_date).days
        if days_since > 0:
            for i in range(1, days_since + 1):
                check_date = streak.last_activity_date + timedelta(days=i)
                has_activity = db.query(models.ActivityCalendar).filter(
                    models.ActivityCalendar.user_id == current_user.id,
                    models.ActivityCalendar.date == check_date,
                    models.ActivityCalendar.practice_count > 0
                ).first()
                if not has_activity:
                    off_days += 1
    
    # Yearly heatmap (last 365 days)
    one_year_ago = today - timedelta(days=365)
    yearly_activities = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == current_user.id,
        models.ActivityCalendar.date >= one_year_ago
    ).all()
    yearly_heatmap = [
        schemas.YearlyHeatmapResponse(date=act.date, practice_count=act.practice_count)
        for act in yearly_activities
    ]
    
    # Streak history (last 6 months)
    six_months_ago = today - timedelta(days=180)
    recent_activities = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == current_user.id,
        models.ActivityCalendar.date >= six_months_ago,
        models.ActivityCalendar.practice_count > 0
    ).order_by(models.ActivityCalendar.date).all()
    
    streak_history = []
    if recent_activities:
        current_streak_start = recent_activities[0].date
        streak_length = 1
        
        for i in range(1, len(recent_activities)):
            days_diff = (recent_activities[i].date - recent_activities[i-1].date).days
            if days_diff == 1:
                streak_length += 1
            else:
                streak_history.append(schemas.StreakHistoryItem(
                    start_date=current_streak_start,
                    streak_length=streak_length,
                    is_active=False
                ))
                current_streak_start = recent_activities[i].date
                streak_length = 1
        
        # Add last streak
        is_active = recent_activities[-1].date == today or recent_activities[-1].date == today - timedelta(days=1)
        streak_history.append(schemas.StreakHistoryItem(
            start_date=current_streak_start,
            streak_length=streak_length,
            is_active=is_active
        ))
    
    # Weekly pattern (aggregate by day of week)
    all_activities = db.query(models.ActivityCalendar).filter(
        models.ActivityCalendar.user_id == current_user.id,
        models.ActivityCalendar.practice_count > 0
    ).all()
    
    weekly_totals = {i: 0 for i in range(7)}  # 0=Monday, 6=Sunday
    day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    for act in all_activities:
        day_of_week = act.date.weekday()  # 0=Monday, 6=Sunday
        # Convert to Sunday=0 format
        day_index = (day_of_week + 1) % 7
        weekly_totals[day_index] += act.practice_count
    
    weekly_pattern = [
        schemas.WeeklyPatternItem(
            day_of_week=i,
            day_name=day_names[i],
            total_practice=weekly_totals[i]
        )
        for i in range(7)
    ]
    
    # Monthly progress (last 12 months)
    monthly_progress = []
    for i in range(12):
        check_date = today - timedelta(days=30 * i)
        month_start = date(check_date.year, check_date.month, 1)
        month_end = date(check_date.year, check_date.month, monthrange(check_date.year, check_date.month)[1])
        
        month_total = db.query(func.sum(models.ActivityCalendar.practice_count)).filter(
            models.ActivityCalendar.user_id == current_user.id,
            models.ActivityCalendar.date >= month_start,
            models.ActivityCalendar.date <= month_end
        ).scalar() or 0
        
        monthly_progress.append(schemas.MonthlyProgressItem(
            month=month_name[check_date.month],
            year=check_date.year,
            total_practice=int(month_total)
        ))
    
    monthly_progress.reverse()  # Oldest to newest
    
    # Time of day (mock data for now - would need to track hour in practice sessions)
    time_of_day = [
        schemas.TimeOfDayItem(period="Morning", total_practice=0),
        schemas.TimeOfDayItem(period="Afternoon", total_practice=0),
        schemas.TimeOfDayItem(period="Evening", total_practice=0),
        schemas.TimeOfDayItem(period="Night", total_practice=total_completions),  # Placeholder
    ]
    
    return schemas.StreakAnalyticsResponse(
        current_streak=current_streak,
        off_days=off_days,
        this_month=this_month_total,
        total_completions=int(total_completions),
        calendar_days=calendar_days,
        yearly_heatmap=yearly_heatmap,
        streak_history=streak_history,
        weekly_pattern=weekly_pattern,
        monthly_progress=monthly_progress,
        time_of_day=time_of_day
    )

