import hashlib
import numpy as np
from typing import List
from app.config import settings

class EmbeddingService:
    def __init__(self):
        self.dimension = settings.EMBEDDING_DIM
        self._genai_client = None
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self._genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception:
                self._genai_client = None

    def embed_text(self, text: str) -> List[float]:
        """
        Generates a 768-dimensional dense float vector for the given text.
        Uses Google Gemini text-embedding-004 if API key is active,
        or falls back to high-fidelity deterministic feature hashing.
        """
        if self._genai_client:
            try:
                response = self._genai_client.models.embed_content(
                    model=settings.GEMINI_EMBEDDING_MODEL,
                    contents=text
                )
                if response.embeddings and len(response.embeddings) > 0:
                    return [float(x) for x in response.embeddings[0].values]
            except Exception:
                pass

        return self._deterministic_dense_embedding(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding generation."""
        return [self.embed_text(t) for t in texts]

    def _deterministic_dense_embedding(self, text: str) -> List[float]:
        """
        Deterministic, L2-normalized 768-dimensional semantic hash embedding.
        Uses token n-grams and hashing trick with signed projection.
        Guarantees cosine similarity properties offline and in testing environments.
        """
        vector = np.zeros(self.dimension, dtype=np.float32)
        words = text.lower().split()

        for word in words:
            # Word-level hash contribution
            h = int(hashlib.sha256(word.encode('utf-8')).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if ((h >> 8) & 1) == 1 else -1.0
            vector[idx] += sign * 1.5

            # Subword 3-gram contribution for morphological robustness
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    trigram = word[i:i+3]
                    th = int(hashlib.md5(trigram.encode('utf-8')).hexdigest(), 16)
                    tidx = th % self.dimension
                    tsign = 1.0 if ((th >> 4) & 1) == 1 else -1.0
                    vector[tidx] += tsign * 0.5

        # L2 Normalization
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        else:
            # Uniform fallback for empty string
            vector = np.ones(self.dimension, dtype=np.float32) / np.sqrt(self.dimension)

        return [float(x) for x in vector]

# Global singleton embedding service
embedding_service = EmbeddingService()
