import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient, models
from app.config import settings
from app.core.embeddings import embedding_service

class RAGVectorStore:
    def __init__(self):
        self.collection_name = settings.QDRANT_COLLECTION
        self.dimension = settings.EMBEDDING_DIM
        self._init_client()

    def _init_client(self):
        try:
            if settings.QDRANT_URL != ":memory:":
                self.client = QdrantClient(url=settings.QDRANT_URL, timeout=5.0)
                # Test connection
                self.client.get_collections()
            else:
                self.client = QdrantClient(":memory:")
        except Exception:
            # Fallback to in-memory instance
            self.client = QdrantClient(":memory:")
        
        self.ensure_collection()

    def ensure_collection(self):
        """Creates the Qdrant collection if it does not already exist."""
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=self.dimension,
                        distance=models.Distance.COSINE
                    )
                )
        except Exception:
            pass

    def upsert_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """
        Embeds and indexes knowledge chunks into Qdrant.
        Generates deterministic UUID5 point IDs from article_id and chunk_index for idempotency.
        """
        if not chunks:
            return 0

        self.ensure_collection()
        points: List[models.PointStruct] = []

        for chunk in chunks:
            article_id = str(chunk.get("articleId", ""))
            chunk_index = int(chunk.get("chunkIndex", 0))
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{article_id}_{chunk_index}"))

            chunk_text = chunk.get("chunkText", "")
            heading = chunk.get("heading", "General")
            combined_text = f"Heading: {heading}\n{chunk_text}"
            vector = embedding_service.embed_text(combined_text)

            payload = {
                "article_id": article_id,
                "article_code": chunk.get("articleCode", ""),
                "chunk_index": chunk_index,
                "heading": heading,
                "chunk_text": chunk_text,
                "access_roles": chunk.get("accessRoles", []),
                "content_hash": chunk.get("contentHash", "")
            }

            points.append(models.PointStruct(
                id=point_id,
                vector=[float(v) for v in vector],
                payload=payload
            ))

        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        return len(points)

    def search_chunks(
        self,
        query: str,
        user_role: str,
        top_k: int = 4,
        score_threshold: float = 0.30
    ) -> List[Dict[str, Any]]:
        """
        Executes payload-filtered cosine similarity search against Qdrant.
        Only chunks where user_role is in access_roles will ever be returned.
        """
        self.ensure_collection()
        query_vector = [float(v) for v in embedding_service.embed_text(query)]

        # Payload filter enforcing strict multi-tenant role isolation
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="access_roles",
                    match=models.MatchAny(any=[user_role])
                )
            ]
        )

        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k,
                score_threshold=score_threshold
            )
        except Exception:
            return []

        hits: List[Dict[str, Any]] = []
        for res in results:
            hits.append({
                "score": round(float(res.score), 4),
                "articleId": res.payload.get("article_id"),
                "articleCode": res.payload.get("article_code"),
                "chunkIndex": res.payload.get("chunk_index"),
                "heading": res.payload.get("heading"),
                "chunkText": res.payload.get("chunk_text"),
                "accessRoles": res.payload.get("access_roles")
            })

        return hits

    def delete_article_chunks(self, article_id: str):
        """Purges all vector chunks associated with an archived or deleted article."""
        self.ensure_collection()
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="article_id",
                                match=models.MatchValue(value=article_id)
                            )
                        ]
                    )
                )
            )
        except Exception:
            pass

    def get_collection_info(self) -> Dict[str, Any]:
        """Returns statistics on the vector index."""
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "name": self.collection_name,
                "vectors_count": getattr(info, "vectors_count", getattr(info, "points_count", 0)),
                "status": getattr(info, "status", "ready")
            }
        except Exception:
            return {"name": self.collection_name, "vectors_count": 0, "status": "unknown"}

# Global vector store instance
rag_store = RAGVectorStore()
