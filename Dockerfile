# Build context: parent directory (PoC/) to access pipeforge + codemind
# docker build -f codeforge/Dockerfile .

# ── Stage 1: Build frontend ──
FROM node:22-alpine AS frontend-build
WORKDIR /build
COPY codeforge/frontend/package.json codeforge/frontend/package-lock.json ./
RUN npm ci
COPY codeforge/frontend/ ./
RUN npm run build

# ── Stage 2: Python backend ──
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy all three projects
COPY pipeforge/ /app/pipeforge/
COPY codemind/ /app/codemind/
COPY codeforge/ /app/codeforge/

# Copy built frontend
COPY --from=frontend-build /build/dist /app/codeforge/frontend/dist

# Install dependencies
WORKDIR /app/codeforge
RUN uv sync --no-dev

EXPOSE 8731

CMD ["uv", "run", "codeforge", "serve", "--host", "0.0.0.0", "--port", "8731"]
