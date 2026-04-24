FROM python:3.11-slim

# Minimal system deps; slim already has what we need.
WORKDIR /app

# Install Python deps first (cached layer).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the app.
COPY . .

# Fly sets $PORT at runtime; default to 8000 for local / Railway.
ENV PORT=8000
EXPOSE 8000

# Use shell-form CMD so $PORT expands. Single worker keeps the in-process
# APScheduler coherent (important — multiple workers would double-tick agents).
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1
