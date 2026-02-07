#!/bin/bash
# Production run script for DigitalOcean App Platform

echo "🚀 Starting Plant Disease Detection API..."
echo "📦 Environment: $(python --version)"

# Create model if it doesn't exist
if [ ! -f "plant_disease_model.h5" ]; then
    echo "🤖 Creating ML model..."
    python setup_model.py
fi

# Use Gunicorn for production
echo "🌍 Starting with Gunicorn..."
exec gunicorn --config gunicorn.conf.py plant_disease_app:app