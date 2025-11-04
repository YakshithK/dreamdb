import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from flask import Flask, json

# Add the current directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Import the app and get_vectorizer from the local service module
from service import app, get_vectorizer

class TestEmbedderService(unittest.TestCase):
    def setUp(self):
        """Set up test client and reset the vectorizer for each test."""
        app.config['TESTING'] = True
        self.client = app.test_client()
        # Reset the vectorizer before each test
        global vectorizer
        vectorizer = None

    def test_health_endpoint(self):
        """Test the health check endpoint."""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['method'], 'TF-IDF')
        self.assertEqual(data['vector_size'], 384)

    def test_embed_single_text(self):
        """Test embedding a single text input."""
        test_text = "This is a test sentence."
        response = self.client.post('/embed', 
                                 data=json.dumps({'text': test_text}),
                                 content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('vectors', data)
        self.assertEqual(len(data['vectors']), 1)  # Single input
        self.assertEqual(len(data['vectors'][0]), 384)  # 384-dimensional vector

    def test_embed_multiple_texts(self):
        """Test embedding multiple texts at once."""
        test_texts = ["First text", "Second text", "Third text"]
        response = self.client.post('/embed', 
                                 data=json.dumps({'text': test_texts}),
                                 content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['vectors']), 3)  # Three inputs
        for vector in data['vectors']:
            self.assertEqual(len(vector), 384)  # Each is 384-dimensional

    def test_embed_invalid_input(self):
        """Test embedding with invalid input type."""
        # Test with non-string, non-array input
        response = self.client.post('/embed', 
                                 data=json.dumps({'text': 123}),
                                 content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('must be string or array', data['error'])

    def test_embed_empty_request(self):
        """Test embedding with empty request body."""
        response = self.client.post('/embed', 
                                 data=json.dumps({}),
                                 content_type='application/json')
        
        self.assertEqual(response.status_code, 200)  # Empty list is valid input
        data = json.loads(response.data)
        self.assertEqual(len(data['vectors']), 0)  # No inputs

    @patch('embedder.service.TfidfVectorizer')
    def test_vectorizer_initialization(self, mock_vectorizer):
        """Test that the vectorizer is initialized correctly."""
        # Reset the vectorizer
        global vectorizer
        vectorizer = None
        
        # Call get_vectorizer which should initialize the vectorizer
        vec = get_vectorizer()
        
        # Check that TfidfVectorizer was called with correct parameters
        mock_vectorizer.assert_called_once_with(
            max_features=384,
            stop_words='english',
            ngram_range=(1, 2),
            lowercase=True,
            norm='l2'
        )

if __name__ == '__main__':
    unittest.main()