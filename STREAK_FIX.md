# Streak Calendar Fix

## Problem
The streak calendar was not updating because practice sessions were not being created when users practiced.

## Solution

### 1. Added Practice Session Creation
- **Practice Page**: Added "Mark as practiced" button for individual questions
- **Practice Page**: Added "Luyện topic này" button that creates practice sessions for all questions in a topic
- These buttons now call `/api/practice/` to create practice sessions, which automatically updates the activity calendar

### 2. Auto-Refresh Features
- **Streak Page**: Automatically refreshes when the window gains focus (if user practiced in another tab)
- **Homepage**: Refreshes progress data every 30 seconds
- **Streak Page**: Added manual "Refresh" button

### 3. Backend Fix
- Fixed date comparison to properly check for activity (ensures `practice_count > 0`)

## How to Use

### To Update the Calendar:

1. **From Practice Page**:
   - Go to `/practice`
   - Answer questions
   - Click "Mark as practiced" on individual questions, OR
   - Click "Luyện topic này" to mark all questions in a topic as practiced

2. **Manual Refresh**:
   - Go to `/streak` page
   - Click the "Refresh" button in the top right

3. **Auto-Refresh**:
   - The calendar will automatically refresh when you switch back to the streak page
   - Homepage updates every 30 seconds

### Testing

You can also use the test script to create practice sessions:

```bash
cd backend
python3 test_practice.py
```

Make sure to update the credentials in the script first!

## What Gets Updated

When you create a practice session:
- ✅ Activity Calendar (for the streak calendar display)
- ✅ Daily Progress (for the homepage progress circle)
- ✅ Streak Counter (current streak, longest streak)
- ✅ Part Progress (progress by IELTS part)

All of these update automatically when you create a practice session!

