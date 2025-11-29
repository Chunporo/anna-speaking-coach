#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}Backend stopped${NC}"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}Frontend stopped${NC}"
    fi
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Check if ports are already in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${RED}Port $1 is already in use!${NC}"
        return 1
    fi
    return 0
}

echo -e "${GREEN}Starting IELTS Speaking Practice Platform...${NC}\n"

# Check ports
if ! check_port 8000; then
    echo -e "${YELLOW}Backend port 8000 is already in use. Please stop the existing service or change the port.${NC}"
    exit 1
fi

if ! check_port 3000; then
    echo -e "${YELLOW}Frontend port 3000 is already in use. Please stop the existing service or change the port.${NC}"
    exit 1
fi

# Start Backend
echo -e "${YELLOW}Starting backend server...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${RED}Virtual environment not found!${NC}"
    echo -e "${YELLOW}Please run setup.sh first or create a virtual environment.${NC}"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found in backend directory.${NC}"
    echo -e "${YELLOW}The backend may not work correctly without proper configuration.${NC}"
fi

# Start backend in background
uvicorn app.main:app --reload --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
    echo -e "${GREEN}Backend logs: backend.log${NC}"
else
    echo -e "${RED}Failed to start backend!${NC}"
    exit 1
fi

cd ..

# Wait a bit for backend to start
sleep 2

# Start Frontend
echo -e "${YELLOW}Starting frontend server...${NC}"
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Warning: .env.local file not found in frontend directory.${NC}"
    echo -e "${YELLOW}Creating default .env.local...${NC}"
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
fi

# Start frontend in background
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"
    echo -e "${GREEN}Frontend logs: frontend.log${NC}"
else
    echo -e "${RED}Failed to start frontend!${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All services are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backend:  http://localhost:8000${NC}"
echo -e "${GREEN}API Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait

