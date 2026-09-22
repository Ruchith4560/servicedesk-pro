from fastapi import FastAPI
from datetime import datetime
from contextlib import asynccontextmanager
from app.api.classify import router as classify_router
from app.core.classifier import classifier

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and warm up the NLP models on application startup
    classifier.load_or_train()
    yield

app = FastAPI(
    title="ServiceDesk Pro AI Microservice",
    description="NLP Classification, Vector Search & RAG Knowledge Retrieval Orchestrator",
    version="1.0.0",
    lifespan=lifespan
)

# Register API Routers
app.include_router(classify_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "servicedesk-pro-ai-service",
        "models_loaded": classifier.is_trained(),
        "timestamp": datetime.utcnow().isoformat()
    }
