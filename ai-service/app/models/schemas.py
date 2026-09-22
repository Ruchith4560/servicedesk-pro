from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

class ClassifyRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Ticket title/subject")
    description: str = Field(..., min_length=5, max_length=4000, description="Detailed problem description")

class ClassifyResponse(BaseModel):
    predicted_category: str = Field(..., description="Predicted category: HARDWARE, SOFTWARE, NETWORK, ACCESS_IAM, SECURITY")
    category_confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for predicted category")
    category_probabilities: Dict[str, float] = Field(..., description="Probability distribution across all categories")
    
    predicted_priority: str = Field(..., description="Predicted priority: LOW, MEDIUM, HIGH, CRITICAL")
    priority_confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for predicted priority")
    priority_probabilities: Dict[str, float] = Field(..., description="Probability distribution across all priorities")
    
    top_keywords: List[str] = Field(default_factory=list, description="Top salient terms driving the model's classification")
    requires_manual_triage: bool = Field(False, description="True if confidence is below threshold or high-risk alert")
    triage_reason: Optional[str] = Field(None, description="Explanation if manual triage is requested")
    suggested_skills: List[str] = Field(default_factory=list, description="Technician skill tags recommended for assignment")
    model_version: str = Field("1.0.0", description="Trained model version identifier")

class ModelMetricsResponse(BaseModel):
    category_accuracy: float
    category_macro_f1: float
    category_weighted_f1: float
    category_report: Dict[str, Any]
    
    priority_accuracy: float
    priority_macro_f1: float
    priority_weighted_f1: float
    priority_report: Dict[str, Any]
    
    confusion_matrix_category: Dict[str, Any]
    trained_at: str
    sample_count: int
