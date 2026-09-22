from pydantic import BaseModel, Field
from typing import List, Optional

class RAGChunkPayload(BaseModel):
    articleId: str
    articleCode: str
    chunkIndex: int
    heading: str = "General"
    chunkText: str
    accessRoles: List[str]
    contentHash: str

class RAGIndexRequest(BaseModel):
    chunks: List[RAGChunkPayload]

class RAGIndexResponse(BaseModel):
    indexed_count: int
    status: str = "success"

class Citation(BaseModel):
    articleCode: str
    heading: str
    relevanceScore: float
    chunkText: str

class RAGQueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=1000, description="User question or ticket symptom description")
    user_role: str = Field("EMPLOYEE", description="Role of the querying user for RBAC isolation")
    top_k: Optional[int] = Field(4, ge=1, le=10, description="Maximum number of context chunks to retrieve")

class RAGQueryResponse(BaseModel):
    answer: str
    citations: List[Citation]
    has_sufficient_context: bool
    confidence: float
