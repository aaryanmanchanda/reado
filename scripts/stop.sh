#!/usr/bin/env bash
set -e

echo "<================================>"
echo "Stopping Reado initiated..."

#stop backend
if [ -f .backend.pid ]; then
  BACKEND_PID=$(cat .backend.pid)
  kill -- -$BACKEND_PID 2>/dev/null || true
  rm .backend.pid
  echo "Backend stopped:D"
else
  echo "No backend PID file :("
fi

#stop frontend
if [ -f .frontend.pid ]; then
  FRONTEND_PID=$(cat .frontend.pid)
  kill -- -$FRONTEND_PID 2>/dev/null || true
  rm .frontend.pid
  echo "Frontend stopped:D"
else
  echo "No frontend PID file :("
fi 
echo "<================================>"
