#!/usr/bin/env python3
"""
Production entry point for Plant Disease Detection API
Optimized for cloud deployment (Render, DigitalOcean, etc.)
"""

import os
from plant_disease_app import app

if __name__ == '__main__':
    # Get port from environment variable (cloud platforms set this)
    port = int(os.environ.get('PORT', 8080))  # DigitalOcean usually uses 8080
    
    print(f"🚀 Starting Plant Disease Detection API on port {port}")
    print("🌍 Production mode enabled")
    
    # For production, use Gunicorn if available, otherwise Flask dev server
    try:
        from gunicorn.app.wsgiapp import run
        print("📦 Using Gunicorn WSGI server")
        # Run with Gunicorn
        app.run(
            host='0.0.0.0',
            port=port,
            debug=False,
            threaded=True  # Enable threading for better performance
        )
    except ImportError:
        print("⚠️ Gunicorn not found, using Flask dev server")
        # Fallback to Flask dev server
        app.run(
            host='0.0.0.0',
            port=port,
            debug=False,
            threaded=True
        )