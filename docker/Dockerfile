# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python Backend & Final Runtime ---
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    DATA_DIR=/app/data \
    ROMS_DIR=/roms \
    DOWNLOADS_DIR=/downloads

# Install system dependencies for archive extraction (7z, unrar, zip)
RUN apt-get update && apt-get install -y --no-install-recommends \
    p7zip-full \
    unrar-free \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for running the application (M-1)
RUN groupadd --gid 1000 romarr && \
    useradd --uid 1000 --gid romarr --shell /bin/bash --create-home romarr

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ /app/backend/

# Copy built frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create storage mounts and set correct ownership
RUN mkdir -p /app/data /roms /downloads && \
    chown -R romarr:romarr /app /roms /downloads

# Drop privileges — run as non-root romarr user
USER romarr

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
