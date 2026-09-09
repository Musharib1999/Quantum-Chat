FROM python:3.11-slim

WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY quantum-backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all backend code into /app
COPY quantum-backend/ .

# Ensure start script is executable
RUN chmod +x start-railway.sh

# Default fallback port (Railway injects PORT dynamically)
EXPOSE 8002

ENTRYPOINT ["./start-railway.sh"]
