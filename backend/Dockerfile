# Backend Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for MySQL client
RUN apt-get update && apt-get install -y default-libmysqlclient-dev gcc pkg-config && rm -rf /var/lib/apt/lists/*

# Copy requirements (you must have a requirements.txt file!)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose Flask port
EXPOSE 5000

# Use flask run (production should use gunicorn, but flask run works for now)
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
