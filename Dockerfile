# Runtime world
FROM node:20-slim

WORKDIR /app

# install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# copy backend source
COPY backend ./

# copy already-built frontend
WORKDIR /app
COPY frontend/build ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "backend/server.js"]
