from fastapi import FastAPI
from datetime import datetime
from contextlib import asynccontextmanager
from app.api.classify import router as classify_router
from app.api.rag import router as rag_router
from app.api.clustering import router as clustering_router
from app.core.classifier import classifier
from app.core.rag_store import rag_store

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and warm up NLP models and Qdrant collection on application startup
    classifier.load_or_train()
    rag_store.ensure_collection()
    yield

app = FastAPI(
    title="ServiceDesk Pro AI Microservice",
    description="NLP Classification, Vector Search & RAG Knowledge Retrieval Orchestrator",
    version="1.0.0",
    lifespan=lifespan
)

# Register API Routers
app.include_router(classify_router)
app.include_router(rag_router)
app.include_router(clustering_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "servicedesk-pro-ai-service",
        "models_loaded": classifier.is_trained(),
        "vector_store_status": rag_store.get_collection_info(),
        "timestamp": datetime.utcnow().isoformat()
    }
