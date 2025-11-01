from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")
app = Flask(__name__)

@app.route("/embed", methods=["POST"])
def embed():
    data = request.json
    texts = data.get("text", [])
    vectors = model.encode(texts).tolist()
    return jsonify({"vectors": vectors})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6789)