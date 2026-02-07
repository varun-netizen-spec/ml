# 🚀 Deployment Guide - Plant Disease Detection API

## Deploy to Render (Recommended)

Render is a modern cloud platform that makes it easy to deploy Python applications with machine learning models.

### Prerequisites
- GitHub account
- Render account (free tier available)
- Your project code

### Step-by-Step Deployment

#### 1. Prepare Your GitHub Repository

1. **Create a new GitHub repository:**
   - Go to [GitHub](https://github.com) and create a new repository
   - Name it something like `plant-disease-api` or `crop-disease-backend`
   - Make it public (required for Render free tier)

2. **Push your code to GitHub:**
   ```bash
   cd /Users/macbookpro16_stic_admin/Documents/msme_backend
   git init
   git add .
   git commit -m "Initial commit - Plant Disease Detection API"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

#### 2. Deploy on Render

1. **Sign up/Login to Render:**
   - Go to [render.com](https://render.com)
   - Sign up with your GitHub account

2. **Create a new Web Service:**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select your plant disease API repository

3. **Configure Deployment Settings:**
   ```
   Name: plant-disease-api (or your preferred name)
   Environment: Python 3
   Build Command: pip install --upgrade pip && pip install -r requirements.txt && python setup_model.py
   Start Command: python main.py
   ```

4. **Environment Variables (Optional):**
   ```
   SECRET_KEY: your-secret-key-here
   FLASK_ENV: production
   ```

5. **Advanced Settings:**
   - Instance Type: Free (for testing) or Starter ($7/month for better performance)
   - Auto-Deploy: Yes (deploys automatically when you push to GitHub)

#### 3. Deployment Configuration Files

Your project already includes these files needed for Render:

- **`runtime.txt`** - Specifies Python version
- **`requirements.txt`** - Python dependencies
- **`build.sh`** - Build script that installs dependencies and creates the model
- **`main.py`** - Production entry point

#### 4. After Deployment

1. **Wait for build to complete** (5-10 minutes for first deployment)
2. **Get your API URL** (e.g., `https://your-app-name.onrender.com`)
3. **Test your endpoints:**
   ```bash
   # Health check
   curl https://your-app-name.onrender.com/api/health
   
   # Test prediction (replace with your actual URL)
   curl -X POST https://your-app-name.onrender.com/api/predict \
     -F "image=@test_image.jpg" \
     -F "plant_type=tomato"
   ```

### 🔧 Alternative: Deploy to Heroku

If you prefer Heroku, you'll need these additional files:

#### Procfile
```
web: python main.py
```

#### app.json (optional)
```json
{
  "name": "Plant Disease Detection API",
  "description": "ML-powered plant disease detection backend",
  "image": "heroku/python",
  "addons": []
}
```

### 🌐 Alternative: Deploy to Railway

Railway is another great option:

1. Connect your GitHub repo at [railway.app](https://railway.app)
2. It auto-detects Python and uses your requirements.txt
3. Set start command: `python main.py`

### 🔒 Production Considerations

#### 1. Security
```python
# Add to your environment variables
SECRET_KEY=your-very-secure-secret-key
FLASK_ENV=production
```

#### 2. Performance Optimization
- Use gunicorn for production WSGI server
- Enable model caching
- Add request rate limiting

#### 3. Monitoring
- Set up health checks
- Monitor API response times
- Track error rates

### 📊 Scaling Options

#### Free Tier Limitations:
- **Render Free:** 500 hours/month, sleeps after 15 min inactivity
- **Heroku Free:** Discontinued
- **Railway Free:** $5 credit monthly

#### Paid Options for Production:
- **Render Starter:** $7/month (recommended)
- **AWS/GCP/Azure:** More complex but scalable

### 🐛 Common Issues & Solutions

#### Issue: "Out of Memory"
**Solution:** 
- Use `opencv-python-headless` instead of `opencv-python`
- Optimize model size
- Upgrade to paid tier

#### Issue: "Build timeout"
**Solution:**
- Optimize build.sh script
- Use smaller model
- Pre-build dependencies

#### Issue: "Cold start delays"
**Solution:**
- Keep app warm with health checks
- Use paid tier
- Implement model caching

### 🧪 Testing Your Deployed API

#### JavaScript/React Frontend Integration:
```javascript
const API_BASE = 'https://your-app-name.onrender.com';

// Upload and predict
const formData = new FormData();
formData.append('image', imageFile);
formData.append('plant_type', 'tomato');

fetch(`${API_BASE}/api/predict`, {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Prediction:', data.prediction);
});
```

#### Python Client Test:
```python
import requests

API_BASE = 'https://your-app-name.onrender.com'

# Test health
response = requests.get(f'{API_BASE}/api/health')
print(response.json())

# Test prediction
with open('plant_image.jpg', 'rb') as f:
    files = {'image': f}
    data = {'plant_type': 'apple'}
    response = requests.post(f'{API_BASE}/api/predict', 
                           files=files, data=data)
    print(response.json())
```

### 📚 Next Steps

1. **Deploy to Render following steps above**
2. **Update your React frontend to use the new API URL**
3. **Test thoroughly with real plant images**
4. **Monitor performance and errors**
5. **Consider upgrading to paid tier for production use**

### 💡 Pro Tips

- **Domain:** Render provides free SSL and custom domains on paid plans
- **CI/CD:** Automatic deployments when you push to GitHub
- **Logs:** Use Render dashboard to monitor application logs
- **Backup:** Keep your model files in version control or cloud storage

---

**🌟 Your plant disease detection API will be live and accessible worldwide! 🌍**