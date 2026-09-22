import os
import re
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

from app.config import settings
from app.core.dataset import (
    CATEGORIES,
    PRIORITIES,
    CATEGORY_SKILL_MAP,
    get_training_data
)
from app.models.schemas import ClassifyResponse

def clean_text(text: str) -> str:
    """Normalize text while preserving technical words and acronyms."""
    text = text.lower()
    text = re.sub(r'[\r\n\t]+', ' ', text)
    text = re.sub(r'[^a-z0-9\s\.\-_]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

class TicketClassifier:
    def __init__(self):
        self.category_pipeline: Optional[Pipeline] = None
        self.priority_pipeline: Optional[Pipeline] = None
        self.metrics: Dict[str, Any] = {}
        self.category_model_path = os.path.join(settings.MODEL_DIR, settings.CATEGORY_MODEL_FILE)
        self.priority_model_path = os.path.join(settings.MODEL_DIR, settings.PRIORITY_MODEL_FILE)
        self.metrics_path = os.path.join(settings.MODEL_DIR, settings.METRICS_FILE)

    def is_trained(self) -> bool:
        return (
            os.path.exists(self.category_model_path)
            and os.path.exists(self.priority_model_path)
        )

    def train(self) -> Dict[str, Any]:
        """Trains dual NLP classification pipelines on enterprise dataset."""
        texts, cat_labels, prio_labels = get_training_data()
        cleaned_texts = [clean_text(t) for t in texts]

        # 1. Build Category Classifier Pipeline
        cat_pipe = Pipeline([
            ('tfidf', TfidfVectorizer(
                ngram_range=(1, 2),
                min_df=1,
                max_features=2500,
                sublinear_tf=True,
                stop_words='english'
            )),
            ('clf', LogisticRegression(
                class_weight='balanced',
                C=1.5,
                max_iter=1000,
                random_state=42
            ))
        ])

        # 2. Build Priority Classifier Pipeline
        prio_pipe = Pipeline([
            ('tfidf', TfidfVectorizer(
                ngram_range=(1, 2),
                min_df=1,
                max_features=2500,
                sublinear_tf=True,
                stop_words='english'
            )),
            ('clf', LogisticRegression(
                class_weight='balanced',
                C=1.2,
                max_iter=1000,
                random_state=42
            ))
        ])

        # Fit models
        cat_pipe.fit(cleaned_texts, cat_labels)
        prio_pipe.fit(cleaned_texts, prio_labels)

        self.category_pipeline = cat_pipe
        self.priority_pipeline = prio_pipe

        # Evaluate performance on training distribution
        cat_preds = cat_pipe.predict(cleaned_texts)
        prio_preds = prio_pipe.predict(cleaned_texts)

        cat_acc = float(accuracy_score(cat_labels, cat_preds))
        cat_macro_f1 = float(f1_score(cat_labels, cat_preds, average='macro'))
        cat_weighted_f1 = float(f1_score(cat_labels, cat_preds, average='weighted'))
        cat_report = classification_report(cat_labels, cat_preds, output_dict=True, zero_division=0)
        cat_cm = confusion_matrix(cat_labels, cat_preds, labels=CATEGORIES).tolist()

        prio_acc = float(accuracy_score(prio_labels, prio_preds))
        prio_macro_f1 = float(f1_score(prio_labels, prio_preds, average='macro'))
        prio_weighted_f1 = float(f1_score(prio_labels, prio_preds, average='weighted'))
        prio_report = classification_report(prio_labels, prio_preds, output_dict=True, zero_division=0)

        self.metrics = {
            "category_accuracy": round(cat_acc, 4),
            "category_macro_f1": round(cat_macro_f1, 4),
            "category_weighted_f1": round(cat_weighted_f1, 4),
            "category_report": cat_report,
            "priority_accuracy": round(prio_acc, 4),
            "priority_macro_f1": round(prio_macro_f1, 4),
            "priority_weighted_f1": round(prio_weighted_f1, 4),
            "priority_report": prio_report,
            "confusion_matrix_category": {
                "labels": CATEGORIES,
                "matrix": cat_cm
            },
            "trained_at": datetime.utcnow().isoformat(),
            "sample_count": len(texts)
        }

        # Save artifacts to disk
        joblib.dump(self.category_pipeline, self.category_model_path)
        joblib.dump(self.priority_pipeline, self.priority_model_path)
        with open(self.metrics_path, "w", encoding="utf-8") as f:
            json.dump(self.metrics, f, indent=2)

        return self.metrics

    def load_or_train(self):
        """Loads serialized models from disk or trains immediately if not present."""
        if self.is_trained():
            try:
                self.category_pipeline = joblib.load(self.category_model_path)
                self.priority_pipeline = joblib.load(self.priority_model_path)
                if os.path.exists(self.metrics_path):
                    with open(self.metrics_path, "r", encoding="utf-8") as f:
                        self.metrics = json.load(f)
                return
            except Exception:
                pass
        
        self.train()

    def explain_features(self, text: str, predicted_class: str, top_k: int = 5) -> List[str]:
        """
        Extracts salient terms contributing most to the predicted class
        using TF-IDF feature weights dot-product with Logistic Regression coefficients.
        """
        if not self.category_pipeline:
            return []

        tfidf: TfidfVectorizer = self.category_pipeline.named_steps['tfidf']
        clf: LogisticRegression = self.category_pipeline.named_steps['clf']

        vector = tfidf.transform([text])
        feature_names = np.array(tfidf.get_feature_names_out())

        class_indices = list(clf.classes_)
        if predicted_class not in class_indices:
            return []

        class_idx = class_indices.index(predicted_class)
        # Multiply sparse tfidf vector by model coefficient vector for class
        row = vector.tocoo()
        contributions: List[Tuple[str, float]] = []
        for col_idx, tfidf_val in zip(row.col, row.data):
            weight = clf.coef_[class_idx, col_idx] * tfidf_val
            contributions.append((feature_names[col_idx], weight))

        # Sort by positive contribution
        contributions.sort(key=lambda x: x[1], reverse=True)
        top_words = [word for word, score in contributions if score > 0][:top_k]
        
        # Fallback to non-zero words if coefficients don't have positive weights
        if not top_words:
            top_words = [word for word, _ in contributions][:top_k]

        return top_words

    def predict(self, title: str, description: str) -> ClassifyResponse:
        """Runs multi-task classification and returns structured prediction with explainability."""
        if not self.category_pipeline or not self.priority_pipeline:
            self.load_or_train()

        raw_text = f"{title} {description}"
        cleaned = clean_text(raw_text)

        # 1. Category Prediction & Probabilities
        cat_classes = list(self.category_pipeline.classes_)
        cat_probs_raw = self.category_pipeline.predict_proba([cleaned])[0]
        cat_probs = {cls_name: round(float(prob), 4) for cls_name, prob in zip(cat_classes, cat_probs_raw)}

        best_cat_idx = int(np.argmax(cat_probs_raw))
        predicted_category = cat_classes[best_cat_idx]
        category_confidence = round(float(cat_probs_raw[best_cat_idx]), 4)

        # 2. Priority Prediction & Probabilities
        prio_classes = list(self.priority_pipeline.classes_)
        prio_probs_raw = self.priority_pipeline.predict_proba([cleaned])[0]
        prio_probs = {cls_name: round(float(prob), 4) for cls_name, prob in zip(prio_classes, prio_probs_raw)}

        best_prio_idx = int(np.argmax(prio_probs_raw))
        predicted_priority = prio_classes[best_prio_idx]
        priority_confidence = round(float(prio_probs_raw[best_prio_idx]), 4)

        # 3. Explainability & Keyword Extraction
        top_keywords = self.explain_features(cleaned, predicted_category, top_k=5)

        # 4. Routing & Manual Triage Rules
        requires_manual_triage = False
        triage_reason = None

        if predicted_category == 'SECURITY' and predicted_priority in ['CRITICAL', 'HIGH']:
            requires_manual_triage = True
            triage_reason = "High-severity security incident flagged for mandatory human technician assessment."
        elif category_confidence < settings.MIN_CONFIDENCE_THRESHOLD:
            requires_manual_triage = True
            triage_reason = f"Low classification confidence ({category_confidence * 100:.1f}% < {settings.MIN_CONFIDENCE_THRESHOLD * 100:.0f}%). Ambiguous ticket symptoms require technician review."

        suggested_skills = CATEGORY_SKILL_MAP.get(predicted_category, [])

        return ClassifyResponse(
            predicted_category=predicted_category,
            category_confidence=category_confidence,
            category_probabilities=cat_probs,
            predicted_priority=predicted_priority,
            priority_confidence=priority_confidence,
            priority_probabilities=prio_probs,
            top_keywords=top_keywords,
            requires_manual_triage=requires_manual_triage,
            triage_reason=triage_reason,
            suggested_skills=suggested_skills,
            model_version="1.0.0"
        )

# Global singleton classifier
classifier = TicketClassifier()
