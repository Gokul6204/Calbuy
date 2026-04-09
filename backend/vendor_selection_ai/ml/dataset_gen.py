import pandas as pd
import numpy as np
import os
import random

def generate_synthetic_dataset(output_path, num_records=500):
    locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'New York', 'London', 'Berlin', 'Shanghai']
    materials = ['Steel Plate', 'Aluminum Sheet', 'Copper Wire', 'Plastic Resins', 'Fasteners', 'Electronic Components']
    
    data = []
    
    for _ in range(num_records):
        org_loc = random.choice(locations[:5])  # Buyer in India
        material = random.choice(materials)
        part_no = f"PN-{random.randint(1000, 9999)}"
        ship_loc = random.choice(locations)
        
        # Base unit price for materials
        base_prices = {
            'Steel Plate': 50, 'Aluminum Sheet': 30, 'Copper Wire': 15,
            'Plastic Resins': 10, 'Fasteners': 5, 'Electronic Components': 100
        }
        
        required_qty = random.randint(100, 1000)
        # Randomly decide if supplier can fulfill full quantity
        supplying_qty = random.choice([required_qty, random.randint(50, required_qty)])
        
        unit_price = base_prices[material] * random.uniform(0.8, 1.4)
        lead_time = random.randint(3, 30)
        
        if ship_loc == org_loc:
            pass # Same location logic
        elif ship_loc in locations[:5]:
            pass # Domestic logic
        else:
            lead_time += random.randint(10, 20) # Shipping lag
            unit_price *= 1.2 # Import duties usually
            
        # Target logic: was_selected (1 if good, 0 otherwise)
        # Good vendors: full quantity, lower unit price, shorter lead time
        is_full = 1 if supplying_qty >= required_qty else 0
        fill_rate = supplying_qty / required_qty
        
        # Simple scoring for synth target generation
        score = (is_full * 40) + (fill_rate * 20) + (100 / (unit_price/base_prices[material]) * 20) + (30 / lead_time * 20)
        
        # Randomness in selection (bias towards high score)
        threshold = random.randint(60, 90)
        was_selected = 1 if score > threshold else 0
        
        data.append({
            'organization_location': org_loc,
            'part_number': part_no,
            'material_name': material,
            'shipment_from_location': ship_loc,
            'lead_time_days': lead_time,
            'supplying_quantity': supplying_qty,
            'unit_price': round(unit_price, 2),
            'required_quantity': required_qty,
            'quantity_fill_rate': round(fill_rate, 2),
            'is_full_quantity': is_full,
            'total_price': round(unit_price * required_qty, 2),
            'was_selected': was_selected
        })
        
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Dataset generated with {len(df)} records at {output_path}")

if __name__ == "__main__":
    # Ensure directory exists
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "data", "vendor_quotes.csv")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    generate_synthetic_dataset(data_path)
