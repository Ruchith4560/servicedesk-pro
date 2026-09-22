from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any
import re

class DuplicateDetector:
    """
    Computes semantic similarity across incident titles and descriptions using 
    title-weighted unigram TF-IDF vector representations and pairwise cosine similarity.
    """
    def _clean_text(self, text: str) -> str:
        # Normalize and strip special punctuation
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
        return " ".join(cleaned.split())

    def _prepare_text(self, title: str, description: str) -> str:
        t = self._clean_text(title)
        d = self._clean_text(description)
        # Title carries high semantic density in IT incidents; weight 2x
        return f"{t} {t} {d}"

    def detect(
        self,
        target_title: str,
        target_description: str,
        candidate_items: List[Dict[str, Any]],
        threshold: float = 0.50
    ) -> List[Dict[str, Any]]:
        if not candidate_items:
            return []

        target_text = self._prepare_text(target_title, target_description)
        candidate_texts = [
            self._prepare_text(c.get("title", ""), c.get("description", ""))
            for c in candidate_items
        ]
        
        all_texts = [target_text] + candidate_texts
        
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 1),
            stop_words="english",
            sublinear_tf=True
        )
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        
        # Target is row 0, candidates are rows 1..N
        sim_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        matches = []
        for idx, score in enumerate(sim_scores):
            score_float = round(float(score), 4)
            if score_float >= threshold:
                if score_float >= 0.85:
                    level = "EXACT"
                elif score_float >= 0.65:
                    level = "HIGH"
                else:
                    level = "MEDIUM"
                    
                candidate = candidate_items[idx]
                matches.append({
                    "id": str(candidate.get("id")),
                    "ticketId": candidate.get("ticketId"),
                    "similarity_score": score_float,
                    "match_level": level,
                    "matched_title": candidate.get("title", "")
                })
        
        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matches

duplicate_detector = DuplicateDetector()
