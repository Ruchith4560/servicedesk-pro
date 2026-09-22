from typing import List, Dict, Any, Optional
from app.config import settings
from app.core.rag_store import rag_store

class RAGOrchestrator:
    def __init__(self):
        self._genai_client = None
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self._genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception:
                self._genai_client = None

    def query(
        self,
        query_text: str,
        user_role: str,
        top_k: int = 4
    ) -> Dict[str, Any]:
        """
        Executes grounded RAG search:
        1. Payload-filtered vector retrieval in Qdrant (filtered strictly by user_role).
        2. Context grounding & prompt synthesis.
        3. Citation generation with relevance scores.
        """
        hits = rag_store.search_chunks(
            query=query_text,
            user_role=user_role,
            top_k=top_k,
            score_threshold=0.25
        )

        if not hits:
            return {
                "answer": "No relevant standard operating procedure was found in the ServiceDesk Knowledge Base matching your role and query. Please create a support ticket to escalate this to an IT technician.",
                "citations": [],
                "has_sufficient_context": False,
                "confidence": 0.0
            }

        citations = []
        context_blocks = []

        for hit in hits:
            citations.append({
                "articleCode": hit["articleCode"],
                "heading": hit["heading"],
                "relevanceScore": hit["score"],
                "chunkText": hit["chunkText"][:200] + ("..." if len(hit["chunkText"]) > 200 else "")
            })

            context_blocks.append(
                f"--- Excerpt from [{hit['articleCode']}] {hit['heading']} ---\n{hit['chunkText']}"
            )

        context_str = "\n\n".join(context_blocks)

        # Generate grounded response
        if self._genai_client:
            answer = self._generate_with_gemini(query_text, context_str)
        else:
            answer = self._generate_deterministic_grounded(query_text, hits)

        avg_confidence = round(sum(h["score"] for h in hits) / len(hits), 4)

        return {
            "answer": answer,
            "citations": citations,
            "has_sufficient_context": True,
            "confidence": avg_confidence
        }

    def _generate_with_gemini(self, query: str, context: str) -> str:
        prompt = f"""You are the ServiceDesk Pro AI Technical Assistant.
Answer the user's IT support question using ONLY the provided Knowledge Base excerpts.

CRITICAL INSTRUCTIONS:
1. Strictly answer based ONLY on the provided Context excerpts. Do NOT invent, assume, or hallucinate steps not written in the text.
2. If the context does not contain the complete solution, state clearly what is covered and advise escalating to a human technician.
3. Cite the relevant article code in brackets, e.g. [KB-1001], whenever providing instructions.
4. Format your instructions in clear, step-by-step numbered lists.

Context Excerpts:
{context}

User Query: {query}
"""
        try:
            from google.genai import types
            response = self._genai_client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=800
                )
            )
            return response.text.strip()
        except Exception:
            return self._generate_deterministic_grounded(query, [])

    def _generate_deterministic_grounded(self, query: str, hits: List[Dict[str, Any]]) -> str:
        """
        Deterministic, offline grounded synthesizer.
        Extracts structured bullet points and action items from top retrieved chunks.
        """
        if not hits:
            return "Please follow corporate SOPs or contact the IT Service Desk for manual assistance."

        top_hit = hits[0]
        article_code = top_hit.get("articleCode", "KB-SOP")
        heading = top_hit.get("heading", "Resolution")
        chunk_text = top_hit.get("chunkText", "")

        lines = [line.strip() for line in chunk_text.split("\n") if line.strip() and not line.strip().startswith("#")]
        action_lines = [l for l in lines if l.startswith("-") or l.startswith("1.") or l.startswith("2.") or l.startswith("3.") or "error" in l.lower() or "verify" in l.lower() or "open" in l.lower() or "navigate" in l.lower()]
        
        if not action_lines:
            action_lines = lines[:4]

        response_lines = [
            f"Based on [{article_code}] ({heading}), here is the standard operating procedure to resolve this issue:",
            ""
        ]

        for i, step in enumerate(action_lines[:5], start=1):
            clean_step = step.lstrip("- 0123456789.").strip()
            response_lines.append(f"{i}. {clean_step}")

        response_lines.append("")
        response_lines.append(f"Reference: Verified procedure from [{article_code}]. If the issue persists, please assign this ticket to a technician.")

        return "\n".join(response_lines)

# Global RAG orchestrator instance
rag_orchestrator = RAGOrchestrator()
