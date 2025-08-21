FROM python:3.10-slim

WORKDIR /app

# Install system-level build tools and headers required for PyAudio
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libasound-dev \
    libportaudio2 \
    libportaudiocpp0 \
    portaudio19-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install pyaudio  
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt
RUN pip install --no-deps RealtimeSTT==0.3.104

# Copy your application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
