import pandas as pd
import numpy as np
import os
import random

def generate_synthetic_dataset(output_path, num_records=2500):
    """
    Generates a synthetic dataset for vendor selection ranking.
    Columns: [unit_price, negotiation_percentage, lead_time_days, distance_to_organization_km, was_selected]
    """
    data = []
    
    for _ in range(num_records):
        # Generate realistic ranges
        # Prices can vary widely, but let's say base is 100-1000
        unit_price = round(random.uniform(10, 5000), 2)
        
        # Negotiation percentage 0-100 (though realistically usually 0-20)
        # We'll allow a wider range as requested (0-100)
        negotiation_percentage = round(random.uniform(0, 100), 2)
        
        # Lead time in days (1 to 90)
        lead_time = random.randint(1, 90)
        
        # Distance 0 to 15000 km (international shipping)
        distance = round(random.uniform(1, 15000), 2)
        
        # --- Target Generation (Heuristic) ---
        # Normalize fields for a raw score (lower is better for cost/time/distance)
        # Normalized Price (0-1): 
        n_price = unit_price / 5000.0
        # Normalized Lead Time (0-1):
        n_lead = lead_time / 90.0
        # Normalized Distance (0-1):
        n_dist = distance / 15000.0
        # Negotiation is tricky: higher percentage might be seen as 
        # "more room to move" or "overpriced initially".
        # Let's assume higher negotiation % is slightly positive for selection.
        n_neg = 1.0 - (negotiation_percentage / 100.0) # 0 is best negotiator? 
        # Actually, let's say lower negotiation is better (fixed price reliability) 
        # OR higher is better (flexibility). Let's go with Lower is better (Price reliability).
        
        # Weighted Score (Lower is better)
        # Price is usually the biggest factor (50%)
        # Lead time (20%)
        # Distance (20%)
        # Negotiation (10%)
        score = (n_price * 0.5) + (n_lead * 0.2) + (n_dist * 0.2) + (n_neg * 0.1)
        
        # Add some noise to simulate real-world irrationality
        score += random.uniform(-0.1, 0.1)
        
        # Decision threshold: Top 20% of scores (lowest weight) are "selected"
        was_selected = 1 if score < 0.3 else 0
        
        data.append({
            'unit_price': unit_price,
            'negotiation_percentage': negotiation_percentage,
            'lead_time_days': lead_time,
            'distance_to_organization_km': distance,
            'was_selected': was_selected
        })
        
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Dataset generated with {len(df)} records at {output_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "data", "vendor_quotes_v2.csv")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    generate_synthetic_dataset(data_path, num_records=2500)
