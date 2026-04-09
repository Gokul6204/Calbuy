import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib
import os

class VendorDataPreprocessor:
    def __init__(self, model_dir=None):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        self.model_dir = model_dir
        self.encoders = {}
        self.categorical_cols = ['organization_location', 'material_name', 'shipment_from_location']
        
    def fit_encoders(self, df):
        for col in self.categorical_cols:
            le = LabelEncoder()
            le.fit(df[col].astype(str))
            self.encoders[col] = le
            joblib.dump(le, os.path.join(self.model_dir, f"{col}_encoder.joblib"))
        print("Encoders fitted and saved.")

    def load_encoders(self):
        for col in self.categorical_cols:
            path = os.path.join(self.model_dir, f"{col}_encoder.joblib")
            if os.path.exists(path):
                self.encoders[col] = joblib.load(path)
            else:
                print(f"Warning: Encoder for {col} not found at {path}")

    def transform(self, df):
        df_transformed = df.copy()
        for col, le in self.encoders.items():
            # Handle unseen labels by mapping them to global 'unknown' or nearest category if needed
            # For simplicity, we'll just treat new labels as the first class or error out
            valid_classes = set(le.classes_)
            df_transformed[col] = df_transformed[col].apply(lambda x: x if x in valid_classes else le.classes_[0])
            df_transformed[col] = le.transform(df_transformed[col].astype(str))
        
        # Select numeric features for model
        feature_cols = [
            'lead_time_days', 'supplying_quantity', 'unit_price', 
            'required_quantity', 'quantity_fill_rate', 'is_full_quantity', 'total_price'
        ] + self.categorical_cols
        
        return df_transformed[feature_cols]

    def engineer_features(self, df, required_qty=None):
        """
        Engineers features if they are not present in raw quotation data.
        """
        temp_df = df.copy()
        if 'required_quantity' not in temp_df.columns and required_qty:
            temp_df['required_quantity'] = required_qty
            
        if 'quantity_fill_rate' not in temp_df.columns:
            temp_df['quantity_fill_rate'] = temp_df['supplying_quantity'] / temp_df['required_quantity']
            
        if 'is_full_quantity' not in temp_df.columns:
            temp_df['is_full_quantity'] = (temp_df['supplying_quantity'] >= temp_df['required_quantity']).astype(int)
            
        if 'total_price' not in temp_df.columns:
            temp_df['total_price'] = temp_df['unit_price'] * temp_df['required_quantity']
            
            # Step completed without supplier_type
            
        return temp_df
