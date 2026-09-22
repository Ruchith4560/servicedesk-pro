from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.models.schemas import ClassifyRequest, ClassifyResponse, ModelMetricsResponse
from app.core.classifier import classifier
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["AI Classification"])

def verify_internal_secret(x_internal_secret: Optional[str] = Header(None)):
    """Optional security guard for sensitive internal admin actions like retraining."""
    if x_internal_secret and x_internal_secret != settings.INTERNAL_AI_SECRET:
        raise HTTPException(status_code=403, detail="Invalid internal authentication secret")
    return True

@router.post("/classify", response_model=ClassifyResponse)
def classify_ticket(payload: ClassifyRequest):
    """
    Classifies an IT support ticket into Category and Priority.
    Returns:
    - Predicted Category & Probabilities
    - Predicted Priority & Probabilities
    - Salient Keyword Feature Attribution
    - Human-in-the-loop manual triage recommendation
    - Recommended technician skills
    """
    try:
        return classifier.predict(title=payload.title, description=payload.description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification inference failure: {str(e)}")

@router.get("/model-metrics", response_model=ModelMetricsResponse)
def get_model_metrics():
    """Returns serialization metrics, classification report, and confusion matrix."""
    if not classifier.metrics:
        classifier.load_or_train()
    
    metrics = classifier.metrics
    if not metrics:
        raise HTTPException(status_code=404, detail="Model metrics unavailable")

    return ModelMetricsResponse(
        category_accuracy=metrics.get("category_accuracy", 0.0),
        category_macro_f1=metrics.get("category_macro_f1", 0.0),
        category_weighted_f1=metrics.get("category_weighted_f1", 0.0),
        category_report=metrics.get("category_report", {}),
        priority_accuracy=metrics.get("priority_accuracy", 0.0),
        priority_macro_f1=metrics.get("priority_macro_f1", 0.0),
        priority_weighted_f1=metrics.get("priority_weighted_f1", 0.0),
        priority_report=metrics.get("priority_report", {}),
        confusion_matrix_category=metrics.get("confusion_matrix_category", {}),
        trained_at=metrics.get("trained_at", ""),
        sample_count=metrics.get("sample_count", 0)
    )

@router.post("/retrain")
def retrain_model(authorized: bool = Depends(verify_internal_secret)):
    """Triggers retraining of NLP classification pipelines on updated corpus."""
    try:
        updated_metrics = classifier.train()
        return {
            "status": "success",
            "message": "Classifier successfully retrained and persisted",
            "metrics": updated_metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")
