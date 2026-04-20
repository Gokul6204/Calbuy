"""
KSS parser utilities for BOM extraction.
"""

from __future__ import annotations

from typing import Dict, List


def convert_to_float(value: str) -> float:
    """Convert values like 3-1/2 or 1/4 to float."""
    s = str(value).strip()
    try:
        if "-" in s and "/" in s:
            whole, frac = s.split("-", 1)
            num, den = frac.split("/", 1)
            return float(whole) + (float(num) / float(den))
        if "/" in s:
            num, den = s.split("/", 1)
            return float(num) / float(den)
        return float(s)
    except Exception:
        return 0.0


def extract_kss_data_from_text(text: str, source_file: str = "") -> List[Dict]:
    """
    Parse KSS text and return Gradeed rows in normalized BOM shape:
    part, size, grade_name, quantity, quantity_type, unit, date_of_requirement, source_file.
    """
    gradeed_data: Dict[tuple, Dict] = {}

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("*"):
            continue

        parts = [p.strip() for p in line.split(",")]
        # D, project, job, phase, sequence, count, part, size, Grade, length...
        if len(parts) <= 9 or parts[0] != "D":
            continue

        try:
            # Index 5: Count
            count_val = float(parts[5])
        except (ValueError, IndexError):
            count_val = 1.0

        part = parts[6]
        size = parts[7]
        grade_name = parts[8]
        
        # 2) If the part is ["nut","bolt","washer","hs"] or (WS + "WASHER"), treat as count
        is_basic_hw = part.lower() in ["nut", "bolt", "washer", "hs"]
        is_ws_washer = (part.upper() == "WS") and ("WASHER" in size.upper())

        if is_basic_hw or is_ws_washer:
            # Instruction: "this only take it as count - sum the index[5]"
            key = (part.upper(), size, grade_name)
            if key not in gradeed_data:
                gradeed_data[key] = {
                    "part": part.upper(),
                    "size": size,
                    "grade_name": grade_name,
                    "quantity": 0.0,
                    "quantity_type": "Count",
                    "unit": "nos",
                    "date_of_requirement": None,
                    "source_file": source_file,
                }
            gradeed_data[key]["quantity"] += count_val
            continue

        if part == "#":
            continue

        try:
            # Index 9: Length/Value
            value_val = float(parts[9])
        except (ValueError, IndexError):
            continue

        # 4) If the part is "PL" it is area convet this into (sq.mm)
        if part == "PL":
            size_parts = size.replace("x", "X").split("X")
            thickness = size_parts[0].strip()
            # Breadth is often the second part of size for PL (e.g., 10x200)
            breadth = size_parts[1].strip() if len(size_parts) > 1 else "0"
            breadth_val = convert_to_float(breadth)
            
            # 1) for all part multiply the length/area with the count
            total_area = (breadth_val * value_val) * count_val
            
            key = (part, thickness, grade_name)
            if key not in gradeed_data:
                gradeed_data[key] = {
                    "part": part,
                    "size": thickness,
                    "grade_name": grade_name,
                    "quantity": 0.0,
                    "quantity_type": "Area",
                    "unit": "sq.mm",
                    "date_of_requirement": None,
                    "source_file": source_file,
                }
            gradeed_data[key]["quantity"] += total_area
        else:
            # 3) convert the length into feet
            # Assuming KSS value is in mm. 1 foot = 304.8 mm
            # 1) for all part multiply the length/area with the count
            total_length_mm = value_val * count_val
            total_length_ft = total_length_mm / 304.8
            
            key = (part, size, grade_name)
            if key not in gradeed_data:
                gradeed_data[key] = {
                    "part": part,
                    "size": size,
                    "grade_name": grade_name,
                    "quantity": 0.0,
                    "quantity_type": "Length",
                    "unit": "feet",
                    "date_of_requirement": None,
                    "source_file": source_file,
                }
            gradeed_data[key]["quantity"] += total_length_ft

    # Ensure backward compatibility with length_area field
    for row in gradeed_data.values():
        row["length_area"] = row["quantity"]

    return list(gradeed_data.values())
