# Use an official lightweight Python runtime as the base image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container
# This is done first to leverage Docker's layer caching.
# If requirements.txt doesn't change, this layer won't be rebuilt.
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application's source code (e.g., app.py)
COPY . .

# Expose the port that Gunicorn will run on
EXPOSE 5000

# Use Gunicorn to run the Flask application
# --bind 0.0.0.0:5000 makes the app accessible from outside the container.
# app:app refers to the 'app' variable inside your 'app.py' file.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]