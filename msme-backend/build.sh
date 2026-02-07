#!/bin/bash
# Build script for Render deployment

set -e  # Exit on any error

echo "🔨 Starting build process..."

# Install Python dependencies
echo "📦 Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# Create the model if it doesn't exist
echo "🤖 Setting up ML model..."
python setup_model.py

echo "✅ Build completed successfully!"