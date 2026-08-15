# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
# PYTHONUNBUFFERED=1 ensures that python output is sent straight to terminal (e.g. your container logs)
# without being buffered, so you can see the output of your application in real time.
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY src/ src/
COPY main.py .

# Expose the port that Cloud Run expects
EXPOSE 8080

# Run the app. 
# CMD is the command that is executed when you start the container.
# We use shell form to enable variable substitution for $PORT
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
