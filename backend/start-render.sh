#!/bin/sh
set -eu

python database/init_db.py --seed-if-empty
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
