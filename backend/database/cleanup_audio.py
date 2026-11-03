"""Preview expired recordings; use --apply to remove audio while retaining feedback/history."""
import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import SessionLocal
from app.core.config import settings
from app import models
from app.services.audio_storage import delete_recording_file

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=30)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if args.days < 1:
        parser.error('--days must be positive')
    with SessionLocal() as db:
        sessions = db.query(models.PracticeSession).filter(models.PracticeSession.created_at < datetime.utcnow() - timedelta(days=args.days), models.PracticeSession.audio_url.isnot(None)).all()
        filenames = {Path(session.audio_url).name for session in sessions}
        if settings.AUDIO_STORAGE == 'local':
            filenames = {name for name in filenames if (settings.UPLOAD_DIR / name).is_file()}
        print(f'{len(filenames)} recordings eligible for deletion')
        if args.apply:
            for filename in filenames:
                delete_recording_file(filename)
            print('Audio removed; transcripts, feedback and progress retained')
if __name__ == '__main__':
    main()
