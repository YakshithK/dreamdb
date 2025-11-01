from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import os

model = SentenceTransformer("all-MiniLM-L6-v2")
app = Flask(__name__)

# Enable CORS for all routes (adjust origins in production)
CORS(app, resources={r"/embed": {"origins": "*"}})

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
        vectors = model.encode(texts).tolist()
        return jsonify({"vectors": vectors})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 6789))
    app.run(host="0.0.0.0", port=port, debug=False)  # debug=False for production