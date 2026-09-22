import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "ServiceDesk Pro AI Microservice")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    INTERNAL_AI_SECRET: str = os.getenv("INTERNAL_AI_SECRET", "internal_shared_secret_token_change_in_production")
    
    # Model storage paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_DIR: str = os.path.join(BASE_DIR, "saved_models")
    CATEGORY_MODEL_FILE: str = "category_classifier.joblib"
    PRIORITY_MODEL_FILE: str = "priority_classifier.joblib"
    METRICS_FILE: str = "model_metrics.json"

    # Confidence Thresholds
    MIN_CONFIDENCE_THRESHOLD: float = float(os.getenv("MIN_CONFIDENCE_THRESHOLD", "0.60"))

    # Vector Database & RAG Configuration
    QDRANT_URL: str = os.getenv("QDRANT_URL", ":memory:")
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "servicedesk_knowledge_base")
    EMBEDDING_DIM: int = 768

    # Gemini LLM & Embeddings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")

settings = Settings()
os.makedirs(settings.MODEL_DIR, exist_ok=True)
