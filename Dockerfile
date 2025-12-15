FROM python:3.11-slim

# Keep Python output unbuffered
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install minimal build deps required by some packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY . /app

# Expose the port the app runs on
EXPOSE 5000

# Default command - runs the Flask app (uses the socketio.run in app.py)
CMD ["python", "app.py"]
