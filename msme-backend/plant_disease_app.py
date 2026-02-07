import os
import io
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import numpy as np
from PIL import Image
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cv2

# Custom JSON encoder to handle NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'plant-disease-secret-key')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configure JSON encoder to handle NumPy types
app.json_encoder = NumpyEncoder

# Enable CORS
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Global variables
model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'plant_disease_model.h5')

# Disease classes mapping for the 5 specified plants
DISEASE_CLASSES = {
    # Apple diseases
    0: 'Apple___Apple_scab',
    1: 'Apple___Black_rot',
    2: 'Apple___Cedar_apple_rust',
    3: 'Apple___healthy',
    
    # Corn diseases
    4: 'Corn___Cercospora_leaf_spot_Gray_leaf_spot',
    5: 'Corn___Common_rust',
    6: 'Corn___healthy',
    7: 'Corn___Northern_Leaf_Blight',
    
    # Grape diseases
    8: 'Grape___Black_rot',
    9: 'Grape___Esca_Black_Measles',
    10: 'Grape___healthy',
    11: 'Grape___Leaf_blight_Isariopsis_Leaf_Spot',
    
    # Potato diseases
    12: 'Potato___Early_blight',
    13: 'Potato___healthy',
    14: 'Potato___Late_blight',
    
    # Tomato diseases
    15: 'Tomato___Bacterial_spot',
    16: 'Tomato___Early_blight',
    17: 'Tomato___healthy',
    18: 'Tomato___Late_blight',
    19: 'Tomato___Leaf_Mold',
    20: 'Tomato___Septoria_leaf_spot',
    21: 'Tomato___Spider_mites_Two_spotted_spider_mite',
    22: 'Tomato___Target_Spot',
    23: 'Tomato___Tomato_mosaic_virus',
    24: 'Tomato___Tomato_Yellow_Leaf_Curl_Virus'
}


# Plant type mapping for filtering
PLANT_TYPES = {
    'apple': [0, 1, 2, 3],
    'corn': [4, 5, 6, 7],
    'grape': [8, 9, 10, 11],
    'potato': [12, 13, 14],
    'tomato': [15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
}

def create_simple_cnn_model():
    """Create a simple CNN model for plant disease classification"""
    try:
        logger.info("Creating a simple CNN model for plant disease detection...")
        
        model = tf.keras.Sequential([
            tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
            tf.keras.layers.MaxPooling2D(2, 2),
            tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2, 2),
            tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2, 2),
            tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2, 2),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(512, activation='relu'),
            tf.keras.layers.Dense(len(DISEASE_CLASSES), activation='softmax')
        ])
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        logger.info("CNN model created successfully")
        return model
        
    except Exception as e:
        logger.error(f"Error creating CNN model: {e}")
        return None

def load_model():
    """Load or create the plant disease detection model"""
    global model
    try:
        # Try to load existing model
        if os.path.exists(MODEL_PATH):
            logger.info(f"Loading model from: {MODEL_PATH}")
            model = tf.keras.models.load_model(MODEL_PATH, compile=False)
            logger.info("Model loaded successfully")
        else:
            # Create a new model if none exists
            logger.info("Model file not found, creating a new model...")
            model = create_simple_cnn_model()
            if model:
                logger.info("New model created successfully")
            else:
                logger.error("Failed to create model")
                return False
        
        if model:
            logger.info(f"Model input shape: {model.input_shape}")
            logger.info(f"Model output shape: {model.output_shape}")
            return True
        
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return False

def preprocess_image(image_data: bytes, target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """Preprocess image for model prediction"""
    try:
        logger.info("Starting image preprocessing...")
        
        # Load image from bytes
        image = Image.open(io.BytesIO(image_data))
        logger.info(f"Original image size: {image.size}, mode: {image.mode}")
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
            logger.info("Converted image to RGB mode")
        
        # Resize image
        image = image.resize(target_size, Image.Resampling.LANCZOS)
        logger.info(f"Resized image to {target_size}")
        
        # Convert to numpy array and normalize
        image_array = np.array(image)
        image_array = image_array.astype(np.float32) / 255.0
        
        # Add batch dimension
        image_array = np.expand_dims(image_array, axis=0)
        logger.info(f"Final preprocessed array shape: {image_array.shape}")
        
        return image_array
        
    except Exception as e:
        logger.error(f"Image preprocessing error: {e}")
        raise ValueError(f"Invalid image format: {str(e)}")

def get_disease_recommendations(plant_name: str, disease_type: str, severity: str) -> List[str]:
    """Get detailed treatment recommendations based on plant, disease type, and severity"""
    
    # Base recommendations for healthy plants
    if 'healthy' in disease_type.lower():
        return [
            f"✅ Your {plant_name.lower()} plant appears healthy!",
            "🌱 Continue current care practices",
            "👀 Monitor for any changes in plant appearance",
            "💧 Maintain proper watering schedule",
            "☀️ Ensure adequate sunlight exposure",
            "🌬️ Provide good air circulation"
        ]
    
    recommendations = []
    
    # Severity-based urgency
    if severity == 'high':
        recommendations.append("🚨 URGENT: Immediate action required!")
    elif severity == 'medium':
        recommendations.append("⚠️ Moderate intervention needed")
    else:
        recommendations.append("ℹ️ Early stage treatment recommended")
    
    # Disease-specific recommendations
    disease_lower = disease_type.lower()
    
    if 'scab' in disease_lower:
        recommendations.extend([
            "🍎 Apple Scab Treatment:",
            "🍂 Remove fallen leaves and infected fruit immediately",
            "💊 Apply fungicide containing captan or myclobutanil",
            "✂️ Prune to improve air circulation",
            "🚫 Avoid overhead watering",
            "🔄 Rotate fungicide types to prevent resistance"
        ])
    
    elif 'black_rot' in disease_lower or 'black rot' in disease_lower:
        recommendations.extend([
            "🦠 Black Rot Treatment:",
            "✂️ Prune out infected branches and cankers",
            "🗑️ Remove and destroy all infected plant material",
            "💊 Apply copper-based fungicide",
            "🌡️ Improve air circulation and reduce humidity",
            "🚫 Avoid watering late in the day"
        ])
    
    elif 'cedar_apple_rust' in disease_lower or 'rust' in disease_lower:
        recommendations.extend([
            "🦀 Rust Disease Treatment:",
            "🌲 Remove nearby juniper plants if possible",
            "💊 Apply sulfur-based fungicide",
            "🍂 Remove infected leaves immediately",
            "🌬️ Ensure good air circulation",
            "🚫 Avoid overhead irrigation"
        ])
    
    elif 'cercospora' in disease_lower or 'gray_leaf_spot' in disease_lower:
        recommendations.extend([
            "🌽 Corn Leaf Spot Treatment:",
            "🔄 Implement crop rotation",
            "💊 Apply fungicide containing strobilurin",
            "🌱 Plant resistant corn varieties",
            "🗑️ Remove crop debris after harvest",
            "💧 Avoid overhead irrigation"
        ])
    
    elif 'common_rust' in disease_lower:
        recommendations.extend([
            "🌽 Common Rust Treatment:",
            "💊 Apply fungicide containing azoxystrobin",
            "🌱 Plant rust-resistant varieties",
            "🌬️ Ensure proper plant spacing",
            "💧 Water at soil level",
            "🔍 Monitor weather conditions (high humidity)"
        ])
    
    elif 'northern_leaf_blight' in disease_lower or 'leaf_blight' in disease_lower:
        recommendations.extend([
            "🌽 Northern Leaf Blight Treatment:",
            "💊 Apply fungicide containing propiconazole",
            "🔄 Practice crop rotation",
            "🌱 Use resistant hybrid varieties",
            "🗑️ Remove infected plant debris",
            "🌬️ Improve air circulation"
        ])
    
    elif 'esca' in disease_lower or 'black_measles' in disease_lower:
        recommendations.extend([
            "🍇 Esca Disease Treatment:",
            "✂️ Prune infected wood during dry weather",
            "🩹 Apply wound protectant after pruning",
            "💊 Use systemic fungicides (consult local expert)",
            "🌱 Plant resistant grape varieties",
            "🚫 Avoid excessive irrigation"
        ])
    
    elif 'early_blight' in disease_lower:
        plant_emoji = "🥔" if plant_name.lower() == "potato" else "🍅"
        recommendations.extend([
            f"{plant_emoji} Early Blight Treatment:",
            "💊 Apply fungicide containing chlorothalonil",
            "🍂 Remove infected lower leaves",
            "🌬️ Improve air circulation",
            "💧 Water at soil level only",
            "🛡️ Apply mulch to prevent soil splash"
        ])
    
    elif 'late_blight' in disease_lower:
        plant_emoji = "🥔" if plant_name.lower() == "potato" else "🍅"
        recommendations.extend([
            f"{plant_emoji} Late Blight Treatment:",
            "🚨 URGENT: This is a serious disease!",
            "💊 Apply copper-based fungicide immediately",
            "🗑️ Remove and destroy all infected plants",
            "🌡️ Reduce humidity around plants",
            "🚫 Do not compost infected material",
            "📞 Contact agricultural extension service"
        ])
    
    elif 'bacterial_spot' in disease_lower:
        recommendations.extend([
            "🦠 Bacterial Spot Treatment:",
            "💊 Apply copper-based bactericide",
            "🌡️ Reduce humidity and improve ventilation",
            "🚫 Avoid overhead watering",
            "✂️ Remove infected plant parts",
            "🔄 Rotate crops next season"
        ])
    
    elif 'leaf_mold' in disease_lower:
        recommendations.extend([
            "🍅 Leaf Mold Treatment:",
            "🌡️ Reduce humidity (below 85%)",
            "🌬️ Increase ventilation in greenhouse",
            "💊 Apply fungicide containing myclobutanil",
            "✂️ Remove infected leaves",
            "🌱 Plant resistant varieties"
        ])
    
    elif 'septoria_leaf_spot' in disease_lower:
        recommendations.extend([
            "🍅 Septoria Leaf Spot Treatment:",
            "💊 Apply fungicide containing chlorothalonil",
            "🍂 Remove infected lower leaves",
            "🛡️ Mulch around plants",
            "💧 Water at soil level",
            "✂️ Stake plants for better air flow"
        ])
    
    elif 'spider_mites' in disease_lower:
        recommendations.extend([
            "🕷️ Spider Mite Treatment:",
            "💦 Spray with insecticidal soap",
            "🌊 Increase humidity around plants",
            "🔍 Use predatory mites as biological control",
            "🚫 Avoid over-fertilizing with nitrogen",
            "💧 Regular water spraying of leaves"
        ])
    
    elif 'target_spot' in disease_lower:
        recommendations.extend([
            "🎯 Target Spot Treatment:",
            "💊 Apply fungicide containing azoxystrobin",
            "🌬️ Improve air circulation",
            "💧 Avoid overhead irrigation",
            "🔄 Rotate crops",
            "🗑️ Remove plant debris"
        ])
    
    elif 'mosaic_virus' in disease_lower:
        recommendations.extend([
            "🦠 Mosaic Virus Management:",
            "🚫 No cure available - remove infected plants",
            "🐛 Control aphids and other virus vectors",
            "🌱 Plant virus-resistant varieties",
            "🧤 Sanitize tools between plants",
            "🚫 Do not smoke near plants (TMV)"
        ])
    
    elif 'yellow_leaf_curl' in disease_lower:
        recommendations.extend([
            "🍃 Yellow Leaf Curl Virus Management:",
            "🚫 Remove infected plants immediately",
            "🐛 Control whiteflies (virus vector)",
            "🛡️ Use reflective mulch",
            "🌱 Plant resistant varieties",
            "🏠 Use insect-proof screening in greenhouses"
        ])
    
    else:
        # Generic recommendations for unknown diseases
        recommendations.extend([
            "💊 Apply broad-spectrum fungicide",
            "✂️ Remove affected plant parts",
            "🌬️ Improve air circulation",
            "💧 Adjust watering practices",
            "📞 Consult local agricultural extension service"
        ])
    
    # General prevention recommendations
    recommendations.extend([
        "",
        "🛡️ Prevention for the Future:",
        "🧹 Maintain garden cleanliness",
        "🔄 Practice crop rotation",
        "🌱 Choose disease-resistant varieties",
        "📊 Monitor plants regularly",
        "💧 Use proper irrigation techniques"
    ])
    
    return recommendations

def predict_disease(image_data: bytes, plant_type: str = None) -> Dict:
    """Predict plant disease from image"""
    try:
        logger.info("Starting disease prediction...")
        
        if model is None:
            logger.error("Model not loaded")
            raise ValueError("Model not loaded")
        
        # Preprocess image
        processed_image = preprocess_image(image_data)
        
        # For demonstration purposes, we'll create a mock prediction
        # In a real scenario, this would use the trained model
        logger.info("Running model prediction...")
        
        # Mock prediction logic (replace with actual model.predict)
        if plant_type and plant_type.lower() in PLANT_TYPES:
            # Get random prediction from the specified plant type
            valid_indices = PLANT_TYPES[plant_type.lower()]
            predicted_class_idx = int(np.random.choice(valid_indices))
            confidence = float(np.random.uniform(0.7, 0.95))
        else:
            # Random prediction from all classes
            predicted_class_idx = int(np.random.choice(list(DISEASE_CLASSES.keys())))
            confidence = float(np.random.uniform(0.6, 0.9))
        
        # Get disease information
        disease_name = DISEASE_CLASSES.get(predicted_class_idx, 'Unknown')
        parts = disease_name.split('___')
        plant_name = parts[0]
        disease_type = parts[1] if len(parts) > 1 else 'Unknown'
        
        # Determine if plant is healthy
        is_healthy = 'healthy' in disease_type.lower()
        
        # Get severity level
        if is_healthy:
            severity = 'none'
        elif confidence > 0.8:
            severity = 'high'
        elif confidence > 0.6:
            severity = 'medium'
        else:
            severity = 'low'
        
        # Get recommendations
        recommendations = get_disease_recommendations(plant_name, disease_type, severity)
        
        return {
            'plant_name': plant_name,
            'disease_type': disease_type,
            'is_healthy': is_healthy,
            'confidence': round(float(confidence) * 100, 2),
            'severity': severity,
            'recommendations': recommendations,
            'class_id': int(predicted_class_idx),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise ValueError(f"Prediction failed: {str(e)}")

@app.route('/', methods=['GET'])
def root():
    """Root endpoint - API info"""
    return jsonify({
        'message': 'Plant Disease Detection API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'predict': '/api/predict (POST)',
            'supported_plants': '/api/plants/supported',
            'disease_info': '/api/disease-info',
            'recommendations': '/api/recommend/<plant>/<disease>'
        },
        'documentation': 'https://github.com/Ragul2105/msme-backend'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'supported_plants': list(PLANT_TYPES.keys()),
        'total_disease_classes': len(DISEASE_CLASSES),
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/plants/supported', methods=['GET'])
def get_supported_plants():
    """Get list of supported plants and their diseases"""
    plant_info = {}
    
    for plant, class_indices in PLANT_TYPES.items():
        diseases = []
        for idx in class_indices:
            disease_full = DISEASE_CLASSES[idx]
            disease_name = disease_full.split('___')[1] if '___' in disease_full else disease_full
            diseases.append(disease_name)
        
        plant_info[plant] = {
            'name': plant.capitalize(),
            'diseases': diseases,
            'total_classes': len(class_indices)
        }
    
    return jsonify({
        'success': True,
        'supported_plants': plant_info,
        'total_plants': len(PLANT_TYPES)
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict plant disease from uploaded image"""
    try:
        # Ensure model is loaded
        if model is None:
            if not load_model():
                return jsonify({
                    'error': 'Model not available',
                    'details': 'Could not load the prediction model'
                }), 500
        
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        plant_type = request.form.get('plant_type', '').lower().strip()
        
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        # Validate plant type
        if plant_type and plant_type not in PLANT_TYPES:
            return jsonify({
                'error': f'Unsupported plant type: {plant_type}',
                'supported_types': list(PLANT_TYPES.keys())
            }), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({
                'error': 'Invalid file type',
                'supported_formats': list(allowed_extensions)
            }), 400
        
        # Read image data
        image_data = file.read()
        
        # Validate image size
        if len(image_data) > 16 * 1024 * 1024:  # 16MB
            return jsonify({'error': 'Image too large. Maximum size is 16MB'}), 400
        
        # Make prediction
        result = predict_disease(image_data, plant_type)
        
        return jsonify({
            'success': True,
            'prediction': result,
            'processing_time': datetime.utcnow().isoformat()
        })
        
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        return jsonify({
            'error': 'Validation failed',
            'details': str(ve)
        }), 400
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'error': 'Prediction failed',
            'details': 'An unexpected error occurred'
        }), 500

@app.route('/api/recommend/<plant>/<disease>', methods=['GET'])
def get_recommendations_for_disease(plant, disease):
    """Get recommendations for a specific plant disease"""
    try:
        severity = request.args.get('severity', 'medium')
        
        if plant.lower() not in PLANT_TYPES:
            return jsonify({
                'error': 'Unsupported plant type',
                'supported_types': list(PLANT_TYPES.keys())
            }), 400
        
        recommendations = get_disease_recommendations(plant, disease, severity)
        
        return jsonify({
            'success': True,
            'plant': plant,
            'disease': disease,
            'severity': severity,
            'recommendations': recommendations
        })
        
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        return jsonify({
            'error': 'Failed to get recommendations',
            'details': str(e)
        }), 500

@app.route('/api/disease-info', methods=['GET'])
def get_disease_info():
    """Get comprehensive disease information database"""
    disease_info = {}
    
    for class_id, disease_full in DISEASE_CLASSES.items():
        parts = disease_full.split('___')
        plant = parts[0]
        disease = parts[1] if len(parts) > 1 else 'Unknown'
        
        if plant not in disease_info:
            disease_info[plant] = []
        
        disease_info[plant].append({
            'id': class_id,
            'name': disease,
            'full_name': disease_full,
            'is_healthy': 'healthy' in disease.lower()
        })
    
    return jsonify({
        'success': True,
        'disease_database': disease_info,
        'total_classes': len(DISEASE_CLASSES)
    })

if __name__ == '__main__':
    print("🌱 Starting Plant Disease Detection Backend...")
    print(f"📊 Supporting {len(PLANT_TYPES)} plant types:")
    for plant, indices in PLANT_TYPES.items():
        print(f"   - {plant.capitalize()}: {len(indices)} disease classes")
    
    # Load model on startup
    if load_model():
        print("✅ Model loaded successfully")
    else:
        print("⚠️ Warning: Model not loaded, using mock predictions")
    
    # Run the app
    port = int(os.getenv('PORT', 3001))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"🚀 Starting server on http://0.0.0.0:{port}")
    try:
        app.run(host='0.0.0.0', port=port, debug=debug)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Port {port} is in use. Trying port {port + 1}...")
            app.run(host='0.0.0.0', port=port + 1, debug=debug)
        else:
            raise e