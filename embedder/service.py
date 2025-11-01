from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
import os

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Use TF-IDF - no model download needed, super lightweight!
vectorizer = None
all_texts = []  # Keep track of all texts for fitting

def get_vectorizer():
    global vectorizer
    if vectorizer is None:
        print("Initializing TF-IDF vectorizer (no model download - instant!)...")
        # Create TF-IDF vectorizer with 384 dimensions (same as MiniLM)
        vectorizer = TfidfVectorizer(
            max_features=384,
            stop_words='english',
            ngram_range=(1, 2),  # Use unigrams and bigrams
            min_df=1,
            max_df=0.95
        )
        print("TF-IDF vectorizer ready!")
    return vectorizer

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy", 
        "method": "TF-IDF",
        "vector_size": 384,
        "memory_footprint": "minimal"
    }), 200

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
        print(f"Encoding {len(texts)} text(s) with TF-IDF...")
        vec = get_vectorizer()
        
        # Add new texts to corpus for better vocabulary
        global all_texts
        all_texts.extend(texts)
        all_texts = list(set(all_texts))  # Remove duplicates
        
        # Fit on all texts we've seen, then transform current texts
        if len(all_texts) > 0:
            vec.fit(all_texts)
        
        # Transform the current texts
        vectors = vec.transform(texts).toarray().tolist()
        
        # Ensure vectors are 384 dimensions (pad with zeros if needed)
        for i, v in enumerate(vectors):
            if len(v) < 384:
                vectors[i] = v + [0.0] * (384 - len(v))
            elif len(v) > 384:
                vectors[i] = v[:384]
        
        print(f"Encoding complete! Vector dimensions: {len(vectors[0])}")
        return jsonify({"vectors": vectors})
    except Exception as e:
        import traceback
        print(f"Error in embed: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500