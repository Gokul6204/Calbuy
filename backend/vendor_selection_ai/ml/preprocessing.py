import pandas as pd
import numpy as np
import joblib
import os

class VendorDataPreprocessor:
    def __init__(self, model_dir=None):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        self.model_dir = model_dir
        self.feature_cols = [
            'unit_price', 'negotiation_percentage', 
            'lead_time_days', 'distance_to_organization_km'
        ]
        
    def fit_encoders(self, df):
        # Numeric only now as per user request, so no LabelEncoders needed
        # But we might want to save the feature list or a scaler if we used one
        pass

    def load_encoders(self):
        # No encoders needed for purely numeric data in this iteration
        pass

    def transform(self, df):
        df_transformed = df.copy()
        
        # Ensure all columns exist, fill with 0 if missing (shouldn't happen with clean data)
        for col in self.feature_cols:
            if col not in df_transformed.columns:
                df_transformed[col] = 0
        
        return df_transformed[self.feature_cols]

    def engineer_features(self, df):
        """
        No complex feature engineering needed for this specific set.
        """
        return df
