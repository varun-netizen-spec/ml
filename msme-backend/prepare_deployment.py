#!/usr/bin/env python3
"""
Pre-deployment checklist and setup script
"""

import os
import subprocess
import json

def check_files():
    """Check if all required files exist"""
    print("📋 Checking deployment files...")
    
    required_files = [
        'plant_disease_app.py',
        'main.py',
        'requirements.txt',
        'runtime.txt',
        'build.sh',
        'setup_model.py'
    ]
    
    missing_files = []
    for file in required_files:
        if os.path.exists(file):
            print(f"   ✅ {file}")
        else:
            print(f"   ❌ {file} (missing)")
            missing_files.append(file)
    
    return len(missing_files) == 0

def test_local_setup():
    """Test if the app runs locally"""
    print("\n🧪 Testing local setup...")
    
    try:
        import flask
        import tensorflow as tf
        import numpy as np
        import PIL
        print("   ✅ All Python packages available")
        
        # Check if model exists or can be created
        if os.path.exists('plant_disease_model.h5'):
            print("   ✅ Model file exists")
        else:
            print("   ⚠️ Model file missing - will be created during deployment")
        
        return True
    except ImportError as e:
        print(f"   ❌ Missing package: {e}")
        return False

def create_gitignore():
    """Create .gitignore file for the project"""
    print("\n📝 Creating .gitignore...")
    
    gitignore_content = """# Virtual environment
.venv/
venv/
env/
__pycache__/
*.pyc
*.pyo
*.pyd

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Temporary files
*.tmp
*.temp

# Model files (comment out if you want to include the model in git)
# plant_disease_model.h5
# model_metadata.json

# Environment variables
.env
"""
    
    with open('.gitignore', 'w') as f:
        f.write(gitignore_content)
    
    print("   ✅ .gitignore created")

def show_deployment_summary():
    """Show deployment summary and next steps"""
    print("\n" + "="*60)
    print("🚀 DEPLOYMENT SUMMARY")
    print("="*60)
    
    print("""
✅ Your project is ready for deployment!

📁 Files prepared:
   • main.py - Production entry point
   • build.sh - Build script for Render
   • runtime.txt - Python version specification
   • requirements.txt - Updated dependencies
   • DEPLOYMENT.md - Complete deployment guide

🌐 Next Steps:

1. CREATE GITHUB REPOSITORY:
   • Go to github.com and create a new repository
   • Make it public (required for Render free tier)

2. PUSH YOUR CODE:
   cd /Users/macbookpro16_stic_admin/Documents/msme_backend
   git init
   git add .
   git commit -m "Initial commit - Plant Disease Detection API"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main

3. DEPLOY ON RENDER:
   • Go to render.com and sign up with GitHub
   • Click "New" → "Web Service"
   • Connect your GitHub repository
   • Configure:
     - Build Command: ./build.sh
     - Start Command: python main.py
   • Deploy!

4. UPDATE YOUR REACT FRONTEND:
   • Replace localhost URLs with your Render URL
   • Example: https://your-app-name.onrender.com

💡 Pro Tips:
   • First deployment takes 5-10 minutes
   • Free tier sleeps after 15 min inactivity
   • Use paid tier ($7/month) for production
   • Monitor logs in Render dashboard

📚 Read DEPLOYMENT.md for detailed instructions!
""")

def main():
    print("🏗️  Plant Disease API - Deployment Preparation")
    print("="*60)
    
    # Check files
    if not check_files():
        print("\n❌ Missing required files. Please run this script from the project directory.")
        return
    
    # Test setup
    if not test_local_setup():
        print("\n❌ Local setup issues detected. Please install missing packages.")
        return
    
    # Create .gitignore
    create_gitignore()
    
    # Show summary
    show_deployment_summary()
    
    print("\n🎉 Ready for deployment!")

if __name__ == "__main__":
    main()