from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.models.schemas import DuplicateDetectionRequest, DuplicateDetectionResponse, DuplicateMatch
from app.core.duplicate_detector import duplicate_detector
from app.config import settings

router = APIRouter(prefix="/api/v1/clustering", tags=["Incident Clustering & Duplicates"])

def verify_internal_secret(x_internal_secret: Optional[str] = Header(None)):
    """Optional validation of shared internal secret header."""
    if x_internal_secret and x_internal_secret != settings.INTERNAL_AI_SECRET:
        raise HTTPException(status_code=403, detail="Invalid internal authentication secret")
    return True

@router.post("/detect-duplicates", response_model=DuplicateDetectionResponse)
def detect_duplicate_incidents(
    payload: DuplicateDetectionRequest,
    authorized: bool = Depends(verify_internal_secret)
):
    """
    Evaluates candidate open tickets against a target incident using semantic 
    n-gram cosine similarity. Returns ranked duplicates meeting the confidence threshold.
    """
    try:
        candidate_dicts = [c.model_dump() for c in payload.candidates]
        
        matches = duplicate_detector.detect(
            target_title=payload.target.title,
            target_description=payload.target.description,
            candidate_items=candidate_dicts,
            threshold=payload.threshold
        )
        
        duplicate_matches = [DuplicateMatch(**m) for m in matches]
        
        return DuplicateDetectionResponse(
            duplicates=duplicate_matches,
            total_candidates_analyzed=len(payload.candidates),
            is_clustered=len(duplicate_matches) > 0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Duplicate incident detection failure: {str(e)}")
