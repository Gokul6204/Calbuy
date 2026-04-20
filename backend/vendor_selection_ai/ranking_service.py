import pandas as pd
import joblib
import os
import numpy as np
from .ml.preprocessing import VendorDataPreprocessor

class VendorRankingService:
    def __init__(self):
        self.model_dir = os.path.join(os.path.dirname(__file__), 'ml', 'models')
        self.model_path = os.path.join(self.model_dir, "vendor_ranker_model.joblib")
        self.model = None
        self.preprocessor = VendorDataPreprocessor(model_dir=self.model_dir)
        self._load_assets()

    def _load_assets(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            self.preprocessor.load_encoders()
        else:
            print(f"Warning: Model assets not found at {self.model_path}. Please run training script.")

    def rank_vendors(self, quotation_data, required_quantity, weights=None):
        """
        quotation_data: List of dicts with [unit_price, negotiation_percentage, lead_time_days, distance_to_organization_km]
        """
        if self.model is None:
            return {"error": "Model not trained or assets missing"}

        # Default weights include distance now
        if not weights:
            weights = {'price': 0.4, 'lead_time': 0.2, 'distance': 0.3, 'negotiation': 0.1}
        else:
            # Normalize provided weights
            total = sum(weights.values())
            if total > 0:
                weights = {k: v / total for k, v in weights.items()}
            else:
                weights = {'price': 0.4, 'lead_time': 0.2, 'distance': 0.3, 'negotiation': 0.1}

        df = pd.DataFrame(quotation_data)
        
        # 1. Transform for model
        X = self.preprocessor.transform(df)
        
        # 2. Get ML Probabilities (likelihood of being 'selected')
        probs = self.model.predict_proba(X)
        ml_scores = probs[:, 1] if probs.shape[1] > 1 else np.full(probs.shape[0], 0.5)
        
        # 3. Heuristic Component for direct comparison
        min_price = df['unit_price'].min() if not df['unit_price'].empty else 0
        min_lead = df['lead_time_days'].min() if not df['lead_time_days'].empty else 1
        min_dist = df['distance_to_organization_km'].min() if not df['distance_to_organization_km'].empty else 0
        
        def calculate_heuristic(row):
            # Normalizing (Higher is better)
            p_score = (min_price / row['unit_price']) if row['unit_price'] > 0 else 0
            l_score = (min_lead / row['lead_time_days']) if row['lead_time_days'] > 0 else 0
            
            # Distance score
            d_score = 0
            if row['distance_to_organization_km'] is not None:
                d_val = float(row['distance_to_organization_km'])
                d_score = (min_dist / d_val) if d_val > 0 else 1.0
            
            # Negotiation score (more negotiation is room for saving)
            n_score = row['negotiation_percentage'] / 100.0 if 'negotiation_percentage' in row else 0
            
            return (p_score * weights.get('price', 0.4)) + \
                   (l_score * weights.get('lead_time', 0.2)) + \
                   (d_score * weights.get('distance', 0.3)) + \
                   (n_score * weights.get('negotiation', 0.1))

        heuristic_scores = df.apply(calculate_heuristic, axis=1)
        
        # Final Combined Score (High ML weight for "model selection")
        # 50% Model Prediction, 50% Direct Heuristic comparison
        final_scores = (heuristic_scores * 0.5) + (ml_scores * 0.5)
        
        df['ai_score'] = (final_scores * 100).round(2) # Convert to 0-100 scale
        
        # 4. Generate Explanations
        df['recommendation_reason'] = df.apply(self._generate_reason, axis=1, args=(min_price, min_lead, min_dist))
        
        # 5. Rank
        ranked_df = df.sort_values(by='ai_score', ascending=False)
        
        return ranked_df.to_dict(orient='records')

    def _generate_reason(self, row, min_price, min_lead, min_dist):
        reasons = []
        if row['unit_price'] <= min_price * 1.05 and row['unit_price'] > 0:
             reasons.append("Most competitive price")
            
        if row['lead_time_days'] <= min_lead + 2:
            reasons.append(f"Fast delivery ({row['lead_time_days']} days)")
            
        d_val = row.get('distance_to_organization_km')
        if d_val is not None:
            if float(d_val) <= min_dist * 1.1 or float(d_val) < 50:
                reasons.append("Geographically closest")
            elif float(d_val) < 500:
                reasons.append("Local region")
        
        if row.get('negotiation_percentage', 0) > 15:
            reasons.append("High negotiation potential")
            
        if not reasons:
            reasons.append("Balanced score across all metrics")
            
        return ", ".join(reasons[:3])
