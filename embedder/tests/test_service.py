import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path to import the service
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from service import app, get_vectorizer

class TestEmbedderService(unittest.TestCase):
    def setUp(self):
        """Set up test client and reset the vectorizer before each test."""
        self.app = app.test_client()
        self.app.testing = True
        
        # Reset the vectorizer before each test
        global vectorizer
        vectorizer = None

    def test_health_endpoint(self):
        """Test the health check endpoint."""
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['status'], 'healthy')
        self.assertEqual(data['method'], 'TF-IDF')
        self.assertEqual(data['vector_size'], 384)

    def test_embed_single_text(self):
        """Test embedding a single text."""
        test_text = "This is a test sentence."
        response = self.app.post('/embed', 
                               json={"text": test_text},
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('vectors', data)
        self.assertEqual(len(data['vectors']), 1)  # One vector for one input text
        self.assertEqual(len(data['vectors'][0]), 384)  # Vector should be 384-dimensional

    def test_embed_multiple_texts(self):
        """Test embedding multiple texts at once."""
        test_texts = ["First test sentence.", "Second test sentence."]
        response = self.app.post('/embed', 
                               json={"text": test_texts},
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('vectors', data)
        self.assertEqual(len(data['vectors']), 2)  # Two vectors for two input texts
        for vector in data['vectors']:
            self.assertEqual(len(vector), 384)  # Each vector should be 384-dimensional

    def test_embed_empty_text(self):
        """Test embedding an empty string."""
        response = self.app.post('/embed', 
                               json={"text": ""},
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)  # Should still return a valid vector
        data = response.get_json()
        self.assertEqual(len(data['vectors'][0]), 384)

    def test_embed_invalid_input(self):
        """Test with invalid input (not a string or list)."""
        response = self.app.post('/embed', 
                               json={"text": 123},
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn('error', data)
        self.assertIn('must be string or array', data['error'])

    def test_vectorizer_initialization(self):
        """Test that the vectorizer is initialized correctly."""
        # First call should initialize the vectorizer
        vec1 = get_vectorizer()
        self.assertIsNotNone(vec1)
        
        # Second call should return the same instance
        vec2 = get_vectorizer()
        self.assertIs(vec1, vec2)

    @patch('service.TfidfVectorizer')
    def test_vectorizer_parameters(self, mock_vectorizer):
        """Test that the vectorizer is created with correct parameters."""
        # Reset vectorizer
        global vectorizer
        vectorizer = None
        
        # Call get_vectorizer which should create a new instance
        get_vectorizer()
        
        # Check that TfidfVectorizer was called with correct parameters
        mock_vectorizer.assert_called_once_with(
            max_features=384,
            stop_words='english',
            ngram_range=(1, 2),
            lowercase=True,
            norm='l2'
        )

    def test_vector_padding(self):
        """Test that vectors are properly padded to 384 dimensions."""
        # Mock the vectorizer to return a smaller vector
        with patch('service.TfidfVectorizer') as mock_vectorizer:
            # Setup mock to return a vector with fewer than 384 dimensions
            mock_instance = MagicMock()
            mock_instance.fit_transform.return_value.toarray.return_value = [[0.1, 0.2, 0.3]]
            mock_vectorizer.return_value = mock_instance
            
            # Reset vectorizer
            global vectorizer
            vectorizer = None
            
            # Make request
            response = self.app.post('/embed', 
                                   json={"text": "test"},
                                   content_type='application/json')
            
            self.assertEqual(response.status_code, 200)
            data = response.get_json()
            self.assertEqual(len(data['vectors'][0]), 384)  # Should be padded to 384
            # First 3 elements should match our mock, rest should be 0
            self.assertEqual(data['vectors'][0][:3], [0.1, 0.2, 0.3])
            self.assertEqual(data['vectors'][0][3:], [0.0] * 381)

    def test_vector_truncation(self):
        """Test that vectors longer than 384 dimensions are truncated."""
        # Mock the vectorizer to return a larger vector
        with patch('service.TfidfVectorizer') as mock_vectorizer:
            # Setup mock to return a vector with more than 384 dimensions
            mock_instance = MagicMock()
            long_vector = [float(i) for i in range(400)]  # 400 dimensions
            mock_instance.fit_transform.return_value.toarray.return_value = [long_vector]
            mock_vectorizer.return_value = mock_instance
            
            # Reset vectorizer
            global vectorizer
            vectorizer = None
            
            # Make request
            response = self.app.post('/embed', 
                                   json={"text": "test"},
                                   content_type='application/json')
            
            self.assertEqual(response.status_code, 200)
            data = response.get_json()
            self.assertEqual(len(data['vectors'][0]), 384)  # Should be truncated to 384
            self.assertEqual(data['vectors'][0], long_vector[:384])  # First 384 elements should match

if __name__ == '__main__':
    unittest.main()
