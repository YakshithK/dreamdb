from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import os

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Lazy load model to save memory on startup
model = None

def get_model():
    global model
    if model is None:
        print("Loading model...")
        model = SentenceTransformer("sentence-transformers/paraphrase-MiniLM-L3-v2")
        print("Model loaded!")
    return model

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "model": "all-MiniLM-L6-v2"}), 200

@app.route("/embed", methods=["POST"])
def embed():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    text_input = data.get("text", [])
    
    # Handle both string and array inputs
    if isinstance(text_input, str):
        texts = [text_input]
    elif isinstance(text_input, list):
        texts = text_input
    else:
        return jsonify({"error": "text must be string or array"}), 400
    
    try:
        model_instance = get_model()  # Lazy load
        vectors = model_instance.encode(texts).tolist()
        return jsonify({"vectors": vectors})
    except Exception as e:
        import traceback
        print(f"Error in embed: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500