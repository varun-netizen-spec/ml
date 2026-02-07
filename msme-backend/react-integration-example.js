// React Frontend Integration - Update after deployment
// Replace the API base URL with your deployed URL

// Example configuration for your React app
const API_CONFIG = {
  // Local development
  LOCAL_URL: 'http://127.0.0.1:3001',
  
  // Production (replace with your actual Render URL)
  PRODUCTION_URL: 'https://your-app-name.onrender.com',
  
  // Auto-detect environment
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-app-name.onrender.com'
    : 'http://127.0.0.1:3001'
};

// Example React component for plant disease prediction
const PlantDiseasePredictor = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [plantType, setPlantType] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handlePlantTypeChange = (event) => {
    setPlantType(event.target.value);
  };

  const submitPrediction = async () => {
    if (!selectedFile) {
      alert('Please select an image file');
      return;
    }

    setLoading(true);
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('plant_type', plantType);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/predict`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setPrediction(result.prediction);
      } else {
        console.error('Prediction failed:', result);
        alert('Prediction failed. Please try again.');
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('Failed to connect to API. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plant-disease-predictor">
      <h2>🌱 Plant Disease Detection</h2>
      
      {/* File Upload */}
      <div className="upload-section">
        <label>
          Upload Plant Image:
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* Plant Type Selection */}
      <div className="plant-type-section">
        <label>
          Plant Type (optional):
          <select value={plantType} onChange={handlePlantTypeChange}>
            <option value="">Any Plant</option>
            <option value="apple">Apple</option>
            <option value="corn">Corn</option>
            <option value="grape">Grape</option>
            <option value="potato">Potato</option>
            <option value="tomato">Tomato</option>
          </select>
        </label>
      </div>

      {/* Submit Button */}
      <button 
        onClick={submitPrediction} 
        disabled={loading || !selectedFile}
        className="predict-button"
      >
        {loading ? 'Analyzing...' : 'Detect Disease'}
      </button>

      {/* Results Display */}
      {prediction && (
        <div className="prediction-results">
          <h3>🔍 Analysis Results</h3>
          <div className="result-item">
            <strong>Plant:</strong> {prediction.plant_name}
          </div>
          <div className="result-item">
            <strong>Disease:</strong> {prediction.disease_type}
          </div>
          <div className="result-item">
            <strong>Healthy:</strong> {prediction.is_healthy ? '✅ Yes' : '❌ No'}
          </div>
          <div className="result-item">
            <strong>Confidence:</strong> {prediction.confidence}%
          </div>
          <div className="result-item">
            <strong>Severity:</strong> {prediction.severity}
          </div>
          
          {prediction.recommendations && (
            <div className="recommendations">
              <h4>💡 Treatment Recommendations:</h4>
              <ul>
                {prediction.recommendations.slice(0, 5).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
              {prediction.recommendations.length > 5 && (
                <p>...and {prediction.recommendations.length - 5} more recommendations</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlantDiseasePredictor;

// CSS Styles (optional)
const styles = `
.plant-disease-predictor {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.upload-section, .plant-type-section {
  margin: 20px 0;
}

.predict-button {
  background-color: #4CAF50;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.predict-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.prediction-results {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.result-item {
  margin: 10px 0;
  padding: 5px;
}

.recommendations {
  margin-top: 15px;
}

.recommendations ul {
  padding-left: 20px;
}

.recommendations li {
  margin: 5px 0;
}
`;

// Environment Variables for React (.env file)
/*
# .env file in your React project root

# Development
REACT_APP_API_URL_DEV=http://127.0.0.1:3001

# Production (update after deployment)
REACT_APP_API_URL_PROD=https://your-app-name.onrender.com

# Current environment
REACT_APP_API_URL=${REACT_APP_API_URL_DEV}
*/