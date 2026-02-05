# Reado - System Architecture
## Overview
BROWSER
  |
  V
NGINX (reverse proxy)
  |             |
  V             V
FRONTEND      BACKEND
(React)       (Node,Express)
		|
		V
	     DATABASE (MongoDB)


## Component Roles

**Browser**
- Initiates HTTP requests
- Requests static assets and API responses

**Reverse Proxy (Nginx)**
- Single public entry point
- Routes requests to frontend or backend
- Returns upstream errors if backend unavailable

**Frontend (React)**
- Static files served to browser
- Calls backend APIs over HTTP

**Backend (Node + Express)**
- Long-running API server
- Processes business logic
- Queries database

**Database (MongoDB)**
- Persistent storage
- Accepts TCP connections from backend

## Communication

- Browser → Proxy: HTTP
- Proxy → Frontend: HTTP
- Proxy → Backend: HTTP
- Backend → MongoDB: TCP

## Failure Points

- Proxy down → entire application unreachable
- Backend down → proxy returns 502/503 errors
- Database down → API errors for data operations

