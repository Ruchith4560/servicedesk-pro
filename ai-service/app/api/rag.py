from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.models.rag_schemas import (
    RAGIndexRequest,
    RAGIndexResponse,
    RAGQueryRequest,
    RAGQueryResponse
)
from app.core.rag_store import rag_store
from app.core.rag_engine import rag_orchestrator

router = APIRouter(prefix="/api/v1/rag", tags=["RAG Knowledge Assistant"])

@router.post("/index", response_model=RAGIndexResponse)
def index_knowledge_chunks(payload: RAGIndexRequest):
    """
    Ingests and embeds published knowledge chunks into the Qdrant vector index.
    """
    try:
        raw_chunks = [chunk.model_dump() for chunk in payload.chunks]
        count = rag_store.upsert_chunks(raw_chunks)
        return RAGIndexResponse(indexed_count=count, status="success")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index knowledge chunks: {str(e)}")

@router.post("/query", response_model=RAGQueryResponse)
def query_knowledge_assistant(payload: RAGQueryRequest):
    """
    Answers an IT support question using role-scoped vector search and grounded LLM generation.
    Enforces payload filtering so confidential internal SOPs never leak to regular employees.
    """
    try:
        result = rag_orchestrator.query(
            query_text=payload.query,
            user_role=payload.user_role,
            top_k=payload.top_k or 4
        )
        return RAGQueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query execution failed: {str(e)}")

@router.delete("/articles/{article_id}")
def delete_article_vectors(article_id: str):
    """
    Purges all vector embeddings for an archived or deleted article.
    """
    try:
        rag_store.delete_article_chunks(article_id)
        return {"status": "success", "message": f"Vectors for article {article_id} purged"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete article vectors: {str(e)}")

@router.get("/status")
def get_rag_status() -> Dict[str, Any]:
    """Returns vector store collection status and count."""
    return rag_store.get_collection_info()
