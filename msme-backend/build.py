#!/bin/bash
# Build script for DigitalOcean App Platform

set -e

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "🤖 Setting up ML model..."
python setup_model.py

echo "✅ Build completed successfully!"