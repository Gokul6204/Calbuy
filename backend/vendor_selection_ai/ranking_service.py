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
        quotation_data: List of dicts matching the feature schema
        required_quantity: The quantity needed for the RFQ
        weights: Dict with 'price', 'lead_time', 'quantity' keys (summing to 1 or will be normalized)
        """
        if self.model is None:
            return {"error": "Model not trained or assets missing"}

        # Default weights if not provided
        if not weights:
            weights = {'price': 0.6, 'lead_time': 0.2, 'quantity': 0.2}
        else:
            # Normalize weights to ensure they sum to 1.0
            total = sum(weights.values())
            if total > 0:
                weights = {k: v / total for k, v in weights.items()}
            else:
                weights = {'price': 0.6, 'lead_time': 0.2, 'quantity': 0.2}

        df = pd.DataFrame(quotation_data)
        
        # 1. Feature Engineering
        df_engineered = self.preprocessor.engineer_features(df, required_qty=required_quantity)
        
        # 2. Transform for model
        X = self.preprocessor.transform(df_engineered)
        
        # 3. Hybrid Scoring System
        # ml_scores logic...
        probs = self.model.predict_proba(X)
        ml_scores = probs[:, 1] if probs.shape[1] > 1 else np.full(probs.shape[0], 0.5)
        
        # Heuristic Component
        min_price = df['total_price'].min() if not df['total_price'].empty else 0
        min_lead = df['lead_time_days'].min() if not df['lead_time_days'].empty else 1
        
        def calculate_heuristic(row):
            # 1. Price Score
            p_score = (min_price / row['total_price']) if row['total_price'] > 0 else 0
            
            # 2. Lead Time Score
            l_score = (min_lead / row['lead_time_days']) if row['lead_time_days'] > 0 else 0
            
            # 3. Quantity Score
            q_score = min(1.0, row['supplying_quantity'] / required_quantity) if required_quantity > 0 else 1.0
            
            return (p_score * weights['price']) + (l_score * weights['lead_time']) + (q_score * weights['quantity'])

        heuristic_scores = df.apply(calculate_heuristic, axis=1)
        
        # C. Final Combined Score (70% Heuristic, 30% ML)
        # We give more weight to the heuristic for immediate logical ranking
        final_scores = (heuristic_scores * 0.7) + (ml_scores * 0.3)
        
        df['ai_score'] = final_scores
        
        # 4. Generate Explanations
        df['recommendation_reason'] = df.apply(self._generate_reason, axis=1, args=(required_quantity, min_price, min_lead))
        
        # 5. Rank
        ranked_df = df.sort_values(by='ai_score', ascending=False)
        
        return ranked_df.to_dict(orient='records')

    def _generate_reason(self, row, required_qty, min_price, min_lead):
        reasons = []
        if row['total_price'] <= min_price and row['total_price'] > 0:
             reasons.append("Most competitive price")
        if row['supplying_quantity'] >= required_qty:
            reasons.append("Full quantity available")
            
        # Explode the lead time logic as requested
        if row['lead_time_days'] <= min_lead:
            reasons.append(f"Fastest lead time ({row['lead_time_days']} days)")
        elif row['lead_time_days'] <= 7:
            reasons.append(f"Fast delivery ({row['lead_time_days']} days)")
        else:
            reasons.append(f"Lead time: {row['lead_time_days']} days")
            
        if row['organization_location'] == row['shipment_from_location']:
            reasons.append("Same-city vendor")
        
        if not reasons:
            reasons.append("Balanced price and lead time")
            
        return ", ".join(reasons[:3])
