import json
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from app.core.dataset import get_training_data, CATEGORIES, PRIORITIES
from app.core.classifier import clean_text, TicketClassifier
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import numpy as np

def run_cross_validation_evaluation(n_splits: int = 4):
    """
    Performs Stratified K-Fold cross validation on the dataset
    to compute realistic out-of-sample generalization metrics.
    """
    texts, cat_labels, prio_labels = get_training_data()
    cleaned = [clean_text(t) for t in texts]

    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    
    y_cat_true, y_cat_pred = [], []
    y_prio_true, y_prio_pred = [], []

    for train_idx, test_idx in skf.split(cleaned, cat_labels):
        X_train = [cleaned[i] for i in train_idx]
        y_train_cat = [cat_labels[i] for i in train_idx]
        y_train_prio = [prio_labels[i] for i in train_idx]

        X_test = [cleaned[i] for i in test_idx]
        y_test_cat = [cat_labels[i] for i in test_idx]
        y_test_prio = [prio_labels[i] for i in test_idx]

        cat_pipe = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=2500, sublinear_tf=True, stop_words='english')),
            ('clf', LogisticRegression(class_weight='balanced', C=1.5, max_iter=1000, random_state=42))
        ])
        cat_pipe.fit(X_train, y_train_cat)
        preds_cat = cat_pipe.predict(X_test)
        y_cat_true.extend(y_test_cat)
        y_cat_pred.extend(preds_cat)

        prio_pipe = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=2500, sublinear_tf=True, stop_words='english')),
            ('clf', LogisticRegression(class_weight='balanced', C=1.2, max_iter=1000, random_state=42))
        ])
        prio_pipe.fit(X_train, y_train_prio)
        preds_prio = prio_pipe.predict(X_test)
        y_prio_true.extend(y_test_prio)
        y_prio_pred.extend(preds_prio)

    cat_acc = accuracy_score(y_cat_true, y_cat_pred)
    cat_macro_f1 = f1_score(y_cat_true, y_cat_pred, average='macro')
    cat_report_str = classification_report(y_cat_true, y_cat_pred, zero_division=0)
    cat_cm = confusion_matrix(y_cat_true, y_cat_pred, labels=CATEGORIES)

    prio_acc = accuracy_score(y_prio_true, y_prio_pred)
    prio_macro_f1 = f1_score(y_prio_true, y_prio_pred, average='macro')
    prio_report_str = classification_report(y_prio_true, y_prio_pred, zero_division=0)

    print("=" * 60)
    print("SERVICEDESK PRO - NLP CLASSIFIER EVALUATION REPORT")
    print(f"Stratified {n_splits}-Fold Cross Validation (N = {len(texts)} samples)")
    print("=" * 60)
    print("\n--- CATEGORY CLASSIFICATION METRICS ---")
    print(f"Overall Accuracy: {cat_acc:.4f} ({cat_acc*100:.1f}%)")
    print(f"Macro Avg F1-Score: {cat_macro_f1:.4f}")
    print("\nDetailed Per-Class Classification Report:")
    print(cat_report_str)
    print("Confusion Matrix (Categories):")
    print("Labels:", CATEGORIES)
    print(cat_cm)

    print("\n" + "=" * 60)
    print("--- PRIORITY CLASSIFICATION METRICS ---")
    print(f"Overall Accuracy: {prio_acc:.4f} ({prio_acc*100:.1f}%)")
    print(f"Macro Avg F1-Score: {prio_macro_f1:.4f}")
    print("\nDetailed Per-Class Classification Report:")
    print(prio_report_str)
    print("=" * 60)

    return {
        "category_accuracy": cat_acc,
        "category_macro_f1": cat_macro_f1,
        "priority_accuracy": prio_acc,
        "priority_macro_f1": prio_macro_f1
    }

if __name__ == "__main__":
    run_cross_validation_evaluation()
