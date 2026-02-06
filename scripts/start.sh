#!/usr/bin/env bash
set -e

echo "Checking environment variables..."

if [ ! -f backend/.env ]; then
  echo "Missing backend/.env file"
  echo "Create it using: cp backend/.env.example backend/.env"
  echo "Remember to run commands from root!"
  exit 1
fi

if [ ! -f frontend/.env ]; then
  echo "Missing frontend/.env file"
  echo "Create it using: cp frontend/.env.example frontend/.env"
  echo "Remember to run commands from root!"
  exit 1
fi

echo "Stopping anything running on ports..."

if lsof -ti :5001 >/dev/null; then
  kill -9 $(lsof -ti :5001)
fi

if lsof -ti :3000 >/dev/null; then
  kill -9 $(lsof -ti :3000)
fi

echo "Starting backend..."

cd backend
setsid node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "Starting frontend..."

cd frontend
setsid PORT=3000 npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo "<================================>"
echo "Reado is starting"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5001"
echo "Logs:"
echo "  tail -f backend.log"
echo "  tail -f frontend.log"
echo "<================================>"
