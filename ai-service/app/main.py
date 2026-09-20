from fastapi import FastAPI
from datetime import datetime

app = FastAPI(
    title="ServiceDesk Pro AI Microservice",
    description="NLP Classification, Vector Search & RAG Knowledge Retrieval Orchestrator",
    version="1.0.0"
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "servicedesk-pro-ai-service",
        "timestamp": datetime.utcnow().isoformat()
    }
