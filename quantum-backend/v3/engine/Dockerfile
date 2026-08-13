# Use official RunPod PyTorch/CUDA developer base image
FROM runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel

WORKDIR /workspace

# Install system dependencies (needed for compiling certain solver binaries)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependency requirements
COPY requirements.txt .

# Install Python requirements with optimized index wheels for CUDA 12.1
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files (excluding model index, which start.sh downloads on boot)
COPY . .

# Ensure start.sh script is executable
RUN chmod +x start.sh

# Expose port 8003
EXPOSE 8003

# Run the startup script
ENTRYPOINT ["./start.sh"]
