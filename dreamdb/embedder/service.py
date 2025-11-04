from flask import Flask, jsonify, request
import numpy as np
from typing import Optional, List, Dict, Any

app = Flask(__name__)

# Simple in-memory vectorizer for testing
class SimpleVectorizer:
    def __init__(self):
        self.dim = 384  # Standard embedding dimension
        
    def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate deterministic embeddings for testing."""
        return [self._text_to_vector(text) for text in texts]
    
    def _text_to_vector(self, text: str) -> List[float]:
        """Convert text to a deterministic vector."""
        # Simple hash-based deterministic vector generation
        vec = []
        for i in range(self.dim):
            # Use a combination of character codes and position to generate deterministic values
            val = 0
            for j, c in enumerate(text):
                val = (val * 31 + ord(c) * (j + 1)) % 1000 / 1000
            vec.append(np.sin(val + i) * 0.5 + 0.5)  # Normalize to [0, 1]
        return vec

# Global vectorizer instance
vectorizer: Optional[SimpleVectorizer] = None

def get_vectorizer() -> SimpleVectorizer:
    """Get or create the vectorizer instance."""
    global vectorizer
    if vectorizer is None:
        vectorizer = SimpleVectorizer()
    return vectorizer

@app.route('/embed', methods=['POST'])
def embed():
    """Endpoint to get embeddings for input text."""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
            
        texts = data['text']
        if not isinstance(texts, list):
            texts = [texts]
            
        vectorizer = get_vectorizer()
        embeddings = vectorizer.embed(texts)
        
        return jsonify({"embeddings": embeddings})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
