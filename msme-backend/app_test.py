import os
import io
import base64
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
from PIL import Image
import tensorflow as tf
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
import firebase_admin
from firebase_admin import credentials, auth, firestore
from functools import wraps
import cv2

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Enable CORS
CORS(app, resources={r"/*": {"origins": [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://172.20.10.14:8080"
]}}, supports_credentials=True)

try:
    # Try to get Firebase credentials from environment
    firebase_creds = os.getenv('FIREBASE_CREDENTIALS')
    if firebase_creds:
        cred_dict = json.loads(firebase_creds)
        cred = credentials.Certificate(cred_dict)
    else:
        # Check if service account file exists and has valid content
        service_account_path = 'firebase-service-account.json'
        if os.path.exists(service_account_path):
            with open(service_account_path, 'r') as f:
                service_account_data = json.load(f)
                # Check if it has placeholder values
                if (service_account_data.get('private_key_id') == 'your-private-key-id' or
                    'your-project-id' in service_account_data.get('project_id', '') or
                    service_account_data.get('private_key', '').startswith('-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFbk7Aup8i9h')):
                    logger.warning("Firebase service account file contains placeholder values. Firebase features will be disabled.")
                    raise ValueError("Invalid Firebase credentials")
                cred = credentials.Certificate(service_account_path)
        else:
            logger.warning("Firebase service account file not found. Firebase features will be disabled.")
            raise FileNotFoundError("Firebase service account file not found")
    
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logger.info("Firebase initialized successfully")
except Exception as e:
    logger.warning(f"Firebase initialization failed: {e}")
    logger.info("Continuing without Firebase. Auth and history features will be disabled.")
    db = None

"""
Load ML model
"""
# Use an absolute path relative to this file so the model is found regardless of cwd
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'plantdiseasedetection.keras')
model = None

def load_model():
    global model
    try:
        # Ensure eager-style execution (disabling eager causes tf.data iteration errors)
        try:
            if not tf.executing_eagerly():
                try:
                    tf.config.run_functions_eagerly(True)
                    logger.info("Enabled eager-style function execution with tf.config.run_functions_eagerly(True)")
                except Exception as inner_e:
                    logger.warning(f"Could not enable eager-style execution: {str(inner_e)}")
            else:
                logger.info("Eager execution is enabled")
        except Exception as e:
            logger.warning(f"Error checking/enabling eager execution: {str(e)}")

        # Configure TF to use CPU (optional)
        try:
            tf.config.set_visible_devices([], 'GPU')
        except Exception:
            # ignore if can't set devices
            pass
        
        logger.info(f"Attempting to load model from: {MODEL_PATH}")
        if os.path.exists(MODEL_PATH):
            logger.info("Model file found, attempting to load...")
            model = tf.keras.models.load_model(MODEL_PATH, compile=False)
            logger.info("Model loaded into memory")
            logger.info("Model configuration:")
            logger.info(f"Input shape: {model.input_shape}")
            logger.info(f"Output shape: {model.output_shape}")
            logger.info(f"✅ Model loaded successfully")
            return True
        else:
            logger.error(f"❌ Model file not found: {MODEL_PATH}")
            logger.info(f"Current directory: {os.getcwd()}")
            logger.info(f"Files in directory: {os.listdir(os.path.dirname(MODEL_PATH))}")
            return False
    except Exception as e:
        logger.error(f"❌ Error loading model: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False


# Attempt to load model at import time so `/api/health` reports correct status and
# predictions may work even if run via a different entrypoint.
try:
    load_model()
except Exception:
    # load_model already logs errors; continue so health check can report model_loaded = False
    pass

# Disease classes mapping
DISEASE_CLASSES = {
    0: 'Apple___Apple_scab',
    1: 'Apple___Black_rot',
    2: 'Apple___Cedar_apple_rust',
    3: 'Apple___healthy',
    4: 'Blueberry___healthy',
    5: 'Cherry___healthy',
    6: 'Cherry___Powdery_mildew',
    7: 'Corn___Cercospora_leaf_spot Gray_leaf_spot',
    8: 'Corn___Common_rust',
    9: 'Corn___healthy',
    10: 'Corn___Northern_Leaf_Blight',
    11: 'Grape___Black_rot',
    12: 'Grape___Esca_(Black_Measles)',
    13: 'Grape___healthy',
    14: 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    15: 'Orange___Haunglongbing_(Citrus_greening)',
    16: 'Peach___Bacterial_spot',
    17: 'Peach___healthy',
    18: 'Pepper,_bell___Bacterial_spot',
    19: 'Pepper,_bell___healthy',
    20: 'Potato___Early_blight',
    21: 'Potato___healthy',
    22: 'Potato___Late_blight',
    23: 'Raspberry___healthy',
    24: 'Soybean___healthy',
    25: 'Squash___Powdery_mildew',
    26: 'Strawberry___healthy',
    27: 'Strawberry___Leaf_scorch',
    28: 'Tomato___Bacterial_spot',
    29: 'Tomato___Early_blight',
    30: 'Tomato___healthy',
    31: 'Tomato___Late_blight',
    32: 'Tomato___Leaf_Mold',
    33: 'Tomato___Septoria_leaf_spot',
    34: 'Tomato___Spider_mites Two-spotted_spider_mite',
    35: 'Tomato___Target_Spot',
    36: 'Tomato___Tomato_mosaic_virus',
    37: 'Tomato___Tomato_Yellow_Leaf_Curl_Virus'
}

# Plant type mapping for filtering
PLANT_TYPES = {
    'apple': [0, 1, 2, 3],
    'corn': [7, 8, 9, 10],
    'grape': [11, 12, 13, 14],
    'potato': [20, 21, 22],
    'tomato': [28, 29, 30, 31, 32, 33, 34, 35, 36, 37]
}

def verify_firebase_token(token: str) -> Optional[Dict]:
    """Verify Firebase ID token"""
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None

def require_auth(f):
    """Decorator to require Firebase authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # If Firebase is not available, skip authentication
        if db is None:
            logger.warning("Firebase not available, skipping authentication")
            g.user = {'uid': 'anonymous', 'email': 'anonymous@example.com'}
            return f(*args, **kwargs)
        
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        decoded_token = verify_firebase_token(token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        g.user = decoded_token
        return f(*args, **kwargs)
    
    return decorated_function

def preprocess_image(image_data: bytes, target_size: Tuple[int, int] = (160, 160)) -> np.ndarray:
    """Preprocess image for model prediction"""
    try:
        # Log preprocessing steps for debugging
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
        logger.info(f"Image array shape before normalization: {image_array.shape}")
        image_array = image_array.astype(np.float32) / 255.0
        
        # Add batch dimension
        image_array = np.expand_dims(image_array, axis=0)
        logger.info(f"Final preprocessed array shape: {image_array.shape}")
        
        return image_array
    except Exception as e:
        logger.error(f"Image preprocessing error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise ValueError(f"Invalid image format: {str(e)}")

def predict_disease(image_data: bytes, plant_type: str = None) -> Dict:
    """Predict plant disease from image"""
    try:
        logger.info("Starting disease prediction...")
        if model is None:
            logger.error("Model not loaded")
            raise ValueError("Model not loaded")
        
        # Log model input requirements
        logger.info(f"Model input shape: {model.input_shape}")
        logger.info(f"Model output shape: {model.output_shape}")
        
        # Preprocess image
        logger.info("Preprocessing image...")
        processed_image = preprocess_image(image_data)
        logger.info(f"Preprocessed image shape: {processed_image.shape}")
        
        # Make prediction
        logger.info("Running model prediction...")
        predictions = model.predict(processed_image, verbose=0)
        logger.info(f"Raw predictions shape: {predictions.shape}")
        logger.info(f"Raw prediction values: {predictions[0]}")
        
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        logger.info(f"Predicted class index: {predicted_class_idx}, confidence: {confidence}")
        
        # Get disease information
        disease_name = DISEASE_CLASSES.get(predicted_class_idx, 'Unknown')
        plant_name = disease_name.split('___')[0]
        disease_type = disease_name.split('___')[1] if '___' in disease_name else 'healthy'
        logger.info(f"Identified disease: {disease_name}")
        
        # Filter by plant type if specified
        if plant_type and plant_type.lower() in PLANT_TYPES:
            valid_indices = PLANT_TYPES[plant_type.lower()]
            if predicted_class_idx not in valid_indices:
                # Find the best prediction within the plant type
                plant_predictions = predictions[0][valid_indices]
                best_idx = np.argmax(plant_predictions)
                predicted_class_idx = valid_indices[best_idx]
                confidence = float(plant_predictions[best_idx])
                disease_name = DISEASE_CLASSES[predicted_class_idx]
                plant_name = disease_name.split('___')[0]
                disease_type = disease_name.split('___')[1] if '___' in disease_name else 'healthy'
        
        # Determine if plant is healthy
        is_healthy = 'healthy' in disease_type.lower()
        
        # Get severity level
        if is_healthy:
            severity = 'low'
        elif confidence > 0.8:
            severity = 'high'
        elif confidence > 0.6:
            severity = 'medium'
        else:
            severity = 'low'
        
        # Get recommendations
        recommendations = get_recommendations(disease_type, severity)
        
        return {
            'plant_name': plant_name,
            'disease_type': disease_type,
            'is_healthy': is_healthy,
            'confidence': round(confidence * 100, 2),
            'severity': severity,
            'recommendations': recommendations,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise ValueError(f"Prediction failed: {str(e)}")

def get_recommendations(disease_type: str, severity: str) -> List[str]:
    """Get treatment recommendations based on disease type and severity"""
    recommendations = []
    
    if 'healthy' in disease_type.lower():
        recommendations = [
            "Continue current care practices",
            "Monitor for any changes in plant appearance",
            "Maintain proper watering and fertilization schedule",
            "Ensure adequate sunlight and air circulation"
        ]
    elif 'blight' in disease_type.lower():
        recommendations = [
            "Remove and destroy affected plant parts immediately",
            "Apply copper-based fungicide",
            "Improve air circulation around plants",
            "Avoid overhead watering",
            "Apply preventive fungicide treatments"
        ]
    elif 'spot' in disease_type.lower():
        recommendations = [
            "Remove infected leaves and dispose properly",
            "Apply fungicide containing chlorothalonil or mancozeb",
            "Water at soil level to avoid wetting foliage",
            "Ensure proper spacing between plants",
            "Apply mulch to prevent soil splash"
        ]
    elif 'rust' in disease_type.lower():
        recommendations = [
            "Remove infected plant material",
            "Apply sulfur-based fungicide",
            "Improve air circulation",
            "Avoid overhead irrigation",
            "Consider resistant varieties for future plantings"
        ]
    elif 'mildew' in disease_type.lower():
        recommendations = [
            "Increase air circulation",
            "Apply fungicide containing myclobutanil or propiconazole",
            "Remove affected plant parts",
            "Reduce humidity around plants",
            "Apply preventive treatments during humid periods"
        ]
    else:
        recommendations = [
            "Consult with local agricultural extension service",
            "Remove affected plant parts",
            "Apply appropriate fungicide or bactericide",
            "Improve growing conditions",
            "Consider resistant varieties"
        ]
    
    # Add severity-specific recommendations
    if severity == 'high':
        recommendations.insert(0, "URGENT: Immediate action required")
        recommendations.append("Consider removing severely affected plants")
    elif severity == 'medium':
        recommendations.insert(0, "Moderate intervention needed")
    
    return recommendations

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'firebase_connected': db is not None,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Verify Firebase token and return user info"""
    try:
        if db is None:
            return jsonify({
                'error': 'Authentication service unavailable',
                'details': 'Firebase is not configured'
            }), 503
        
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        decoded_token = verify_firebase_token(token)
        if not decoded_token:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Get user data from Firestore
        user_doc = db.collection('users').document(decoded_token['uid']).get()
        user_data = user_doc.to_dict() if user_doc.exists else None
        
        return jsonify({
            'success': True,
            'user': {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'name': user_data.get('name') if user_data else None,
                'profile': user_data
            }
        })
    
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        if db is None:
            return jsonify({
                'error': 'Authentication service unavailable',
                'details': 'Firebase is not configured'
            }), 503
        
        data = request.get_json()
        token = data.get('token')
        user_data = data.get('userData', {})
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        decoded_token = verify_firebase_token(token)
        if not decoded_token:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Save user data to Firestore
        user_ref = db.collection('users').document(decoded_token['uid'])
        user_ref.set({
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'name': user_data.get('name'),
            'phone': user_data.get('phone'),
            'location': user_data.get('location'),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        })
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'name': user_data.get('name')
            }
        })
    
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict plant disease from uploaded image"""
    try:
        # Ensure model is loaded (try to load if not)
        if model is None:
            logger.info("Model not loaded, attempting to load model before prediction...")
            if not load_model():
                return jsonify({
                    'error': 'Model not available', 
                    'details': 'Could not load the model.'
                }), 500
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        plant_type = request.form.get('plant_type', '').lower()
        
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'error': 'Invalid file type. Only PNG, JPG, JPEG, WEBP are allowed'}), 400
        
        # Read image data
        image_data = file.read()
        
        # Validate image size
        if len(image_data) > 16 * 1024 * 1024:  # 16MB
            return jsonify({'error': 'Image too large. Maximum size is 16MB'}), 400
        
        try:
            # Make prediction
            result = predict_disease(image_data, plant_type)
            
            # Save prediction to user history if Firestore is available and user is authenticated
            if db and hasattr(g, 'user') and g.user and g.user.get('uid') != 'anonymous':
                try:
                    prediction_ref = db.collection('predictions').document()
                    prediction_ref.set({
                        'user_id': g.user['uid'],
                        'plant_type': plant_type,
                        'result': result,
                        'image_filename': secure_filename(file.filename),
                        'created_at': datetime.utcnow()
                    })
                except Exception as e:
                    logger.error(f"Failed to save prediction to Firestore: {e}")
            
            return jsonify({
                'success': True,
                'prediction': result
            })
            
        except ValueError as ve:
            # Specific error handling for prediction issues
            logger.error(f"Prediction failed with ValueError: {str(ve)}")
            return jsonify({
                'error': 'Prediction failed',
                'details': str(ve)
            }), 400
            
        except Exception as e:
            # Log unexpected errors during prediction
            logger.error(f"Unexpected error during prediction: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({
                'error': 'Prediction failed',
                'details': 'An unexpected error occurred during prediction.'
            }), 500
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': 'Prediction failed'}), 500

@app.route('/api/user/history', methods=['GET'])
@require_auth
def get_user_history():
    """Get user's prediction history"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        if not db:
            return jsonify({'error': 'Database not available'}), 500
        
        # Query user's predictions
        predictions_ref = db.collection('predictions')
        query = predictions_ref.where('user_id', '==', g.user['uid']).order_by('created_at', direction=firestore.Query.DESCENDING)
        
        # Pagination
        start_after = None
        if page > 1:
            # Get the last document from previous page
            prev_query = query.limit((page - 1) * limit)
            prev_docs = prev_query.stream()
            prev_docs_list = list(prev_docs)
            if prev_docs_list:
                start_after = prev_docs_list[-1]
        
        if start_after:
            query = query.start_after(start_after)
        
        query = query.limit(limit)
        docs = query.stream()
        
        predictions = []
        for doc in docs:
            pred_data = doc.to_dict()
            pred_data['id'] = doc.id
            predictions.append(pred_data)
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'page': page,
            'limit': limit
        })
    
    except Exception as e:
        logger.error(f"History retrieval error: {e}")
        return jsonify({'error': 'Failed to retrieve history'}), 500

@app.route('/api/plants/info', methods=['GET'])
def get_plants_info():
    """Get plant information database"""
    try:
        plant_info = {
            'apple': {
                'name': 'Apple',
                'scientific_name': 'Malus domestica',
                'diseases': ['Apple scab', 'Black rot', 'Cedar apple rust'],
                'optimal_conditions': {
                    'temperature': '15-24°C',
                    'humidity': '60-70%',
                    'soil_ph': '6.0-7.0'
                }
            },
            'corn': {
                'name': 'Corn',
                'scientific_name': 'Zea mays',
                'diseases': ['Cercospora leaf spot', 'Common rust', 'Northern Leaf Blight'],
                'optimal_conditions': {
                    'temperature': '21-27°C',
                    'humidity': '50-70%',
                    'soil_ph': '5.8-7.0'
                }
            },
            'grape': {
                'name': 'Grape',
                'scientific_name': 'Vitis vinifera',
                'diseases': ['Black rot', 'Esca', 'Leaf blight'],
                'optimal_conditions': {
                    'temperature': '15-30°C',
                    'humidity': '60-80%',
                    'soil_ph': '6.0-7.0'
                }
            },
            'potato': {
                'name': 'Potato',
                'scientific_name': 'Solanum tuberosum',
                'diseases': ['Early blight', 'Late blight'],
                'optimal_conditions': {
                    'temperature': '15-20°C',
                    'humidity': '70-80%',
                    'soil_ph': '5.0-6.0'
                }
            },
            'tomato': {
                'name': 'Tomato',
                'scientific_name': 'Solanum lycopersicum',
                'diseases': ['Bacterial spot', 'Early blight', 'Late blight', 'Leaf Mold', 'Septoria leaf spot'],
                'optimal_conditions': {
                    'temperature': '21-27°C',
                    'humidity': '60-70%',
                    'soil_ph': '6.0-6.8'
                }
            }
        }
        
        return jsonify({
            'success': True,
            'plants': plant_info
        })
    
    except Exception as e:
        logger.error(f"Plant info error: {e}")
        return jsonify({'error': 'Failed to retrieve plant information'}), 500

if __name__ == '__main__':
    # Load model on startup
    load_model()
    
    # Run the app
    port = int(os.getenv('PORT', 3001))  # Changed default port to 3001
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"Starting Flask app on port {port}...")
    try:
        app.run(host='0.0.0.0', port=port, debug=debug)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Port {port} is in use. Trying port {port + 1}...")
            app.run(host='0.0.0.0', port=port + 1, debug=debug)
        else:
            raise e
