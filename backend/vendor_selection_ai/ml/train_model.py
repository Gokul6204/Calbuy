import pandas as pd
import joblib
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

try:
    from vendor_selection_ai.ml.preprocessing import VendorDataPreprocessor
except ImportError:
    from preprocessing import VendorDataPreprocessor

def train():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "data", "vendor_quotes_v2.csv")
    model_dir = os.path.join(base_dir, "models")
    
    if not os.path.exists(data_path):
        print("Dataset not found. Please run dataset_gen.py first.")
        return

    df = pd.read_csv(data_path)
    
    preprocessor = VendorDataPreprocessor(model_dir=model_dir)
    preprocessor.fit_encoders(df)
    
    X = preprocessor.transform(df)
    y = df['was_selected']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForestClassifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred)}")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save the model
    model_path = os.path.join(model_dir, "vendor_ranker_model.joblib")
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train()
