FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.lock .

# Install Python dependencies
RUN pip install --no-cache-dir --only-binary=:all: --require-hashes -r requirements.lock

# Copy application code
COPY app/*.py ./app/
COPY app/core/*.py ./app/core/
COPY app/routers/*.py ./app/routers/
COPY app/services/*.py ./app/services/
COPY app/utils/*.py ./app/utils/
COPY database/init_db.py database/cleanup_audio.py database/schema.sql database/seed_data.sql ./database/
COPY migrations/env.py migrations/baseline.sql ./migrations/
COPY migrations/versions/*.py ./migrations/versions/
COPY alembic.ini start-render.sh ./

# Create uploads directory
RUN groupadd --system app && useradd --system --gid app app \
    && mkdir -p uploads/audio uploads/tts \
    && chown -R app:app uploads

USER app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

