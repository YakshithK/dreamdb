from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")
app = Flask(__name__)

@app.route("/embed", methods=["POST"])
def embed():
    data = request.json
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
    app.run(host="0.0.0.0", port=6789)