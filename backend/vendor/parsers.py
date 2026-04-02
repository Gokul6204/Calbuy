"""
Parsers for Vendor files: XLSX, CSV, PDF.
Returns list of dicts with keys: vendor_id, vendor_name, location, address.
"""

import csv
import io
import openpyxl
import pdfplumber

# Column name variants (case-insensitive)
VENDOR_ID_ALIASES = ("vendor_id", "vendor id", "id", "vendor code", "code")
VENDOR_NAME_ALIASES = ("vendor_name", "vendor name", "name", "company", "vendor", "supplier")
MOBILE_ALIASES = ("mobile_number", "mobile number", "mobile", "phone", "contact", "phone number", "ph no")
EMAIL_ALIASES = ("email", "gmail", "mail", "email id", "email_id")
LOCATION_ALIASES = ("location", "city", "state", "region")
ADDRESS_ALIASES = ("address", "full address", "street", "office address")

def _normalize_headers(row):
    """Map first row to standard keys."""
    if not row or len(row) < 1:
        return None
    normalized = {}
    for i, cell in enumerate(row):
        if cell is None: continue
        key = str(cell).strip().lower()
        if not key: continue

        if key in VENDOR_ID_ALIASES or "vendorid" in key.replace("_","").replace(" ",""):
            normalized["vendor_id"] = i
        elif key in VENDOR_NAME_ALIASES or "vendorname" in key.replace("_","").replace(" ",""):
            normalized["vendor_name"] = i
        elif key in MOBILE_ALIASES or "mobile" in key or "phone" in key:
            normalized["mobile_number"] = i
        elif key in EMAIL_ALIASES or "email" in key or "gmail" in key:
            normalized["email"] = i
        elif key in LOCATION_ALIASES:
            normalized["location"] = i
        elif key in ADDRESS_ALIASES:
            normalized["address"] = i
            
    # Heuristic fallback if not all found
    if "vendor_id" not in normalized:
        normalized["vendor_id"] = 0
    if "vendor_name" not in normalized:
        normalized["vendor_name"] = 1 if len(row) > 1 else 0
        
    return normalized

def _row_to_vendor_dict(row, headers):
    """Convert a data row to vendor dict."""
    get_cell = lambda idx: (row[idx] if idx is not None and idx < len(row) else None) or ""
    
    vendor_id = str(get_cell(headers.get("vendor_id"))).strip() or "N/A"
    vendor_name = str(get_cell(headers.get("vendor_name"))).strip() or "N/A"
    mobile_number = str(get_cell(headers.get("mobile_number"))).strip()
    email = str(get_cell(headers.get("email"))).strip()
    location = str(get_cell(headers.get("location"))).strip()
    address = str(get_cell(headers.get("address"))).strip()
    
    return {
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "mobile_number": mobile_number,
        "email": email,
        "location": location,
        "address": address,
    }

def parse_xlsx(file_content):
    wb = openpyxl.load_workbook(io.BytesIO(file_content), read_only=True, data_only=True)
    rows = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows(values_only=True):
            if any(row): rows.append(row)
    if not rows: return []
    headers = _normalize_headers(rows[0])
    if not headers: return []
    return [_row_to_vendor_dict(r, headers) for r in rows[1:] if any(r)]

def parse_csv(file_content):
    try:
        text = file_content.decode("utf-8")
    except UnicodeDecodeError:
        text = file_content.decode("latin-1")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows: return []
    headers = _normalize_headers(rows[0])
    if not headers: return []
    return [_row_to_vendor_dict(r, headers) for r in rows[1:] if any(r)]

def parse_pdf(file_content):
    result = []
    with pdfplumber.open(io.BytesIO(file_content)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables or []:
                if not table: continue
                headers = _normalize_headers(table[0])
                if not headers: continue
                for row in table[1:]:
                    if any(row):
                        result.append(_row_to_vendor_dict(row, headers))
    return result

def parse_file(file_content, filename):
    ext = (filename or "").lower().split(".")[-1]
    if ext in ("xlsx", "xls"): return parse_xlsx(file_content)
    if ext == "csv": return parse_csv(file_content)
    if ext == "pdf": return parse_pdf(file_content)
    raise ValueError(f"Unsupported format: {ext}")
