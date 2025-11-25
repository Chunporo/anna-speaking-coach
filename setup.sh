#!/bin/bash

echo "Setting up IELTS Speaking Practice Platform..."
echo ""

# Backend setup
echo "Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please edit backend/.env with your database credentials"
fi

cd ..

# Frontend setup
echo ""
echo "Setting up frontend..."
cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Create .env.local file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
fi

cd ..

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up PostgreSQL database:"
echo "   createdb ielts_speaking"
echo "   psql ielts_speaking < backend/database/schema.sql"
echo "   psql ielts_speaking < backend/database/seed_data.sql"
echo ""
echo "2. Edit backend/.env with your database credentials"
echo ""
echo "3. Start backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload --port 8000"
echo ""
echo "4. Start frontend (in another terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""

