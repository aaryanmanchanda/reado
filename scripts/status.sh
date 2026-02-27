#!/usr/bin/env bash

echo "Checking Reado status..."
backend_status="down"
frontend_status="down"

if curl -s http://localhost:5001/health | grep -q '"status":"ok"'; then
  backend_status="healthy"
fi

if curl -s http://localhost:3000 | grep "reado-frontend" > /dev/null; then
  frontend_status="healthy"
fi

# Human output
echo "Backend: $backend_status"
echo "Frontend: $frontend_status"

# JSON output
echo "{\"backend\":\"$backend_status\",\"frontend\":\"$frontend_status\"}"
