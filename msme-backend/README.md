# Plant Disease Detection Backend

A Flask-based REST API for detecting diseases in plants using machine learning. Currently supports **Apple**, **Corn**, **Grape**, **Potato**, and **Tomato** plants.

## 🌟 Features

- **Plant Disease Detection**: Upload images to detect diseases in 5 plant types
- **25+ Disease Classes**: Supports detection of major diseases affecting the supported plants
- **Treatment Recommendations**: Provides detailed recommendations for each detected disease
- **RESTful API**: Easy to integrate with frontend applications
- **Severity Assessment**: Evaluates disease severity levels (low, medium, high)
- **Multi-format Support**: Accepts PNG, JPG, JPEG, WEBP, and BMP images

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Virtual environment (recommended)

### Installation

1. **Clone or navigate to the project directory**
```bash
cd /path/to/plant-disease-backend
```

2. **Set up virtual environment**
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up the model**
```bash
python setup_model.py
```

5. **Run the application**
```bash
python plant_disease_app.py
```

The server will start on `http://localhost:5000` (or the next available port).

## 📚 API Endpoints

### 1. Health Check
**GET** `/api/health`

Check if the API is running and the model is loaded.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "supported_plants": ["apple", "corn", "grape", "potato", "tomato"],
  "total_disease_classes": 25,
  "timestamp": "2023-11-19T10:30:00.000Z"
}
```

### 2. Supported Plants
**GET** `/api/plants/supported`

Get information about supported plants and their diseases.

**Response:**
```json
{
  "success": true,
  "supported_plants": {
    "apple": {
      "name": "Apple",
      "diseases": ["Apple_scab", "Black_rot", "Cedar_apple_rust", "healthy"],
      "total_classes": 4
    },
    "tomato": {
      "name": "Tomato", 
      "diseases": ["Bacterial_spot", "Early_blight", "healthy", "..."],
      "total_classes": 10
    }
  },
  "total_plants": 5
}
```

### 3. Disease Prediction
**POST** `/api/predict`

Upload an image to detect plant diseases.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `image`: Image file (required)
  - `plant_type`: Plant type filter - "apple", "corn", "grape", "potato", or "tomato" (optional)

**Example using curl:**
```bash
curl -X POST http://localhost:3001/api/predict \
  -F "image=@plant_leaf.jpg" \
  -F "plant_type=tomato"
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "plant_name": "Tomato",
    "disease_type": "Early_blight",
    "is_healthy": false,
    "confidence": 87.34,
    "severity": "high",
    "class_id": 16,
    "timestamp": "2023-11-19T10:30:00.000Z",
    "recommendations": [
      "🚨 URGENT: Immediate action required!",
      "🍅 Early Blight Treatment:",
      "💊 Apply fungicide containing chlorothalonil",
      "🍂 Remove infected lower leaves",
      "🌬️ Improve air circulation",
      "💧 Water at soil level only",
      "🛡️ Apply mulch to prevent soil splash"
    ]
  },
  "processing_time": "2023-11-19T10:30:01.000Z"
}
```

### 4. Disease Recommendations
**GET** `/api/recommend/<plant>/<disease>?severity=<level>`

Get treatment recommendations for a specific plant disease.

**Parameters:**
- `plant`: Plant name (apple, corn, grape, potato, tomato)
- `disease`: Disease name
- `severity`: Severity level (low, medium, high) - query parameter

**Example:**
```bash
curl http://localhost:3001/api/recommend/tomato/Early_blight?severity=high
```

### 5. Disease Information Database
**GET** `/api/disease-info`

Get comprehensive information about all supported diseases.

**Response:**
```json
{
  "success": true,
  "disease_database": {
    "Apple": [
      {"id": 0, "name": "Apple_scab", "is_healthy": false},
      {"id": 3, "name": "healthy", "is_healthy": true}
    ]
  },
  "total_classes": 25
}
```

## 🌱 Supported Plants & Diseases

### Apple (4 classes)
- Apple Scab
- Black Rot
- Cedar Apple Rust
- Healthy

### Corn (4 classes)
- Cercospora Leaf Spot (Gray Leaf Spot)
- Common Rust
- Northern Leaf Blight
- Healthy

### Grape (4 classes)
- Black Rot
- Esca (Black Measles)
- Leaf Blight (Isariopsis Leaf Spot)
- Healthy

### Potato (3 classes)
- Early Blight
- Late Blight
- Healthy

### Tomato (10 classes)
- Bacterial Spot
- Early Blight
- Late Blight
- Leaf Mold
- Septoria Leaf Spot
- Spider Mites
- Target Spot
- Tomato Mosaic Virus
- Tomato Yellow Leaf Curl Virus
- Healthy

## 🧪 Testing

Run the test suite to verify all endpoints:

```bash
python test_api.py
```

## 📁 Project Structure

```
plant-disease-backend/
├── plant_disease_app.py      # Main Flask application
├── setup_model.py           # Model setup script
├── test_api.py             # API test suite
├── requirements.txt        # Python dependencies
├── plant_disease_model.h5  # Trained model (generated)
├── model_metadata.json    # Model information (generated)
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

- `PORT`: Server port (default: 5000)
- `FLASK_ENV`: Set to 'development' for debug mode
- `SECRET_KEY`: Flask secret key

### Model Configuration

The model expects:
- **Input**: RGB images of size 224x224 pixels
- **Output**: 25 disease classes across 5 plant types

## 📝 Example Usage

### Python Client Example

```python
import requests

# Health check
response = requests.get('http://localhost:3001/api/health')
print(response.json())

# Disease prediction
with open('plant_image.jpg', 'rb') as image_file:
    files = {'image': image_file}
    data = {'plant_type': 'tomato'}
    response = requests.post('http://localhost:3001/api/predict', 
                           files=files, data=data)
    result = response.json()
    
    if result['success']:
        prediction = result['prediction']
        print(f"Plant: {prediction['plant_name']}")
        print(f"Disease: {prediction['disease_type']}")
        print(f"Confidence: {prediction['confidence']}%")
        print("Recommendations:")
        for rec in prediction['recommendations']:
            print(f"  - {rec}")
```

### JavaScript Fetch Example

```javascript
// Disease prediction
const formData = new FormData();
formData.append('image', imageFile);
formData.append('plant_type', 'apple');

fetch('http://localhost:3001/api/predict', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        console.log('Prediction:', data.prediction);
    }
});
```

## 🚧 Development Notes

- The current model uses mock predictions for demonstration
- To use a real trained model, replace the prediction logic in `predict_disease()`
- The model architecture is a CNN with 25 output classes
- Recommendations are rule-based and can be extended
- CORS is enabled for all origins in development

## 📖 API Status Codes

- **200**: Success
- **400**: Bad request (invalid input, unsupported file type, etc.)
- **500**: Server error (model not loaded, prediction failed, etc.)

## 🔒 Security Considerations

- File size limited to 16MB
- Only image files are accepted
- Input validation on plant types
- Secure filename handling

## 🤝 Contributing

1. Add new disease classes to `DISEASE_CLASSES`
2. Update `PLANT_TYPES` mapping
3. Extend `get_disease_recommendations()` for new diseases
4. Update documentation

## 📄 License

This project is for educational and research purposes.

---

**🌿 Happy Plant Disease Detection! 🌿**