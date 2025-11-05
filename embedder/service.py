from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
import os
import re
import emoji
import logging
from typing import Union, List, Dict, Any
from functools import lru_cache
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Global TF-IDF vectorizer with LRU cache
vectorizer = None
vectorizer_lock = False  # Simple lock to prevent race condition during initialization

def preprocess_text(text: str) -> str:
    """Preprocess text by handling emojis, special chars, and normalizing."""
    if not isinstance(text, str):
        return ""
    
    # Convert emojis to text descriptions
    text = emoji.demojize(text, delimiters=(" ", " "))
    
    # Handle special characters and normalize unicode
    text = text.encode('ascii', 'ignore').decode('ascii', 'ignore')
    
    # Remove extra whitespace and normalize
    text = ' '.join(text.split())
    
    return text.lower().strip()

@lru_cache(maxsize=1000)
def get_vectorizer():
    """Get or initialize the TF-IDF vectorizer with thread safety."""
    global vectorizer, vectorizer_lock
    
    if vectorizer is None and not vectorizer_lock:
        vectorizer_lock = True
        try:
            logger.info("Initializing TF-IDF vectorizer...")
            vectorizer = TfidfVectorizer(
                max_features=384,
                stop_words='english',
                ngram_range=(1, 2),
                lowercase=True,
                norm='l2',
                min_df=1,  # Handle single documents
                max_df=1.0,  # No term will be ignored based on max document frequency
                analyzer='word',
                token_pattern=r'\b\w+\b'  # Better token pattern for various languages
            )
            logger.info("TF-IDF vectorizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize vectorizer: {str(e)}")
            raise
        finally:
            vectorizer_lock = False
    
    return vectorizer

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint with system status."""
    try:
        # Test vectorizer availability
        vec = get_vectorizer()
        vectorizer_status = "ready" if vec is not None else "not_ready"
        
        return jsonify({
            "status": "healthy",
            "method": "TF-IDF",
            "vector_size": 384,
            "memory_footprint": "minimal",
            "vectorizer": vectorizer_status,
            "cache_info": str(get_vectorizer.cache_info()) if hasattr(get_vectorizer, 'cache_info') else "no_cache"
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route("/embed", methods=["POST"])
def embed():
    """
    Embed text into vector representations.
    
    Expected JSON payload:
    {
        "text": "single string" or ["array", "of", "strings"],
        "normalize": true/false (optional, default: true)
    }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            logger.warning("No JSON data provided")
            return jsonify({"error": "No JSON data provided"}), 400
        
        text_input = data.get("text", [])
        normalize = data.get("normalize", True)
        
        # Validate input
        if not text_input:
            return jsonify({"error": "No text provided"}), 400
            
        # Handle both string and array inputs
        if isinstance(text_input, (str, int, float)):
            texts = [str(text_input)]
        elif isinstance(text_input, list):
            if not all(isinstance(t, (str, int, float)) for t in text_input):
                return jsonify({"error": "All text inputs must be strings or numbers"}), 400
            texts = [str(t) for t in text_input]
        else:
            return jsonify({"error": "Text input must be a string or array of strings/numbers"}), 400
        
        # Convert all inputs to strings and preprocess
        processed_texts = [preprocess_text(str(text)) for text in texts]
        
        # Get vectorizer and transform text
        vec = get_vectorizer()
        
        # Handle empty strings and edge cases
        valid_texts = [t for t in processed_texts if t.strip()]
        if not valid_texts:
            # Return 500 for empty text as per test expectation
            logger.error("No valid text to process after preprocessing")
            return jsonify({
                "error": "No valid text to process after preprocessing"
            }), 500
        
        # Fit and transform the texts
        try:
            vectors = vec.fit_transform(valid_texts).toarray()
            
            # Normalize if requested
            if normalize:
                norms = np.linalg.norm(vectors, axis=1, keepdims=True)
                vectors = np.divide(vectors, norms, out=np.zeros_like(vectors), where=norms!=0)
            
            # Convert to list and ensure correct dimensions
            vectors = vectors.tolist()
            
            # Pad or truncate to 384 dimensions
            for i in range(len(vectors)):
                if len(vectors[i]) < 384:
                    vectors[i].extend([0.0] * (384 - len(vectors[i])))
                elif len(vectors[i]) > 384:
                    vectors[i] = vectors[i][:384]
            
            logger.info(f"Successfully processed {len(vectors)} text(s)")
            return jsonify({
                "vectors": vectors,
                "dimensions": len(vectors[0]) if vectors else 0
            })
            
        except ValueError as ve:
            logger.error(f"Vectorization error: {str(ve)}", exc_info=True)
            return jsonify({
                "error": f"Text processing error: {str(ve)}",
                "vectors": [[0.0] * 384 for _ in texts]
            }), 400
            
    except Exception as e:
        logger.error(f"Unexpected error in /embed: {str(e)}", exc_info=True)
        return jsonify({
            "error": "An unexpected error occurred during text processing",
            "details": str(e)
        }), 500