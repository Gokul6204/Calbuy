"""
Parsers for BOM files: XLSX, CSV, PDF.
Returns list of dicts with keys: bom_id, material, quantity, date_of_requirement.
"""

import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation

import openpyxl
import pdfplumber


# Column name variants we accept (case-insensitive)
BOM_ID_ALIASES = ("bom_id", "bom id", "bom", "id", "part no", "part_no", "item", "item no")
MATERIAL_ALIASES = ("material", "material description", "description", "part", "part name", "item name")
QUANTITY_ALIASES = ("quantity", "qty", "qty required", "required qty", "amount", "qty req")
PART_NUMBER_ALIASES = ("part_number", "part number", "part no", "p/n", "part_no", "pn")
DATE_ALIASES = ("date of requirement", "date_of_requirement", "requirement date", "required date", "date", "due date")


def _normalize_headers(row):
    """Map first row to standard keys; return None if not enough columns."""
    if not row or len(row) < 2:
        return None
    normalized = {}
    for i, cell in enumerate(row):
        if cell is None:
            continue
        key = str(cell).strip().lower() if cell else ""
        if not key:
            continue
        if key in BOM_ID_ALIASES or key.startswith("bom"):
            normalized["bom_id"] = i
        elif key in MATERIAL_ALIASES or "material" in key or "description" in key or "part" in key:
            normalized["material"] = i
        elif key in QUANTITY_ALIASES or "qty" in key or "quantity" in key:
            normalized["quantity"] = i
        elif key in PART_NUMBER_ALIASES or "part number" in key or "p/n" in key:
            normalized["part_number"] = i
        elif key in DATE_ALIASES or "date" in key or "requirement" in key:
            normalized["date_of_requirement"] = i
    if "bom_id" not in normalized:
        normalized["bom_id"] = 0
    if "material" not in normalized:
        normalized["material"] = 1 if len(row) > 1 else 0
    if "quantity" not in normalized:
        normalized["quantity"] = 2 if len(row) > 2 else 1
    if "part_number" not in normalized:
        normalized["part_number"] = None
    if "date_of_requirement" not in normalized:
        normalized["date_of_requirement"] = 3 if len(row) > 3 else None
    return normalized


def _parse_date(val):
    """Parse date from string or datetime."""
    if val is None or (isinstance(val, str) and not val.strip()):
        return None
    if hasattr(val, "date"):
        return val.date()
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def _parse_quantity(val):
    """Parse quantity to Decimal."""
    if val is None or (isinstance(val, str) and not val.strip()):
        return Decimal("0")
    if isinstance(val, (int, float)):
        return Decimal(str(val))
    s = str(val).strip().replace(",", "")
    try:
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _row_to_bom_dict(row, headers, source_file=""):
    """Convert a data row to BOM dict using header indices."""
    get_cell = lambda idx: (row[idx] if idx is not None and idx < len(row) else None) or ""
    bom_id = str(get_cell(headers["bom_id"])).strip() or "N/A"
    material = str(get_cell(headers["material"])).strip() or "N/A"
    quantity = _parse_quantity(get_cell(headers["quantity"]))
    part_number = str(get_cell(headers.get("part_number"))).strip() if headers.get("part_number") is not None else ""
    date_val = get_cell(headers["date_of_requirement"]) if headers.get("date_of_requirement") is not None else None
    date_of_req = _parse_date(date_val)
    return {
        "bom_id": bom_id,
        "part_number": part_number,
        "material": material,
        "quantity": quantity,
        "date_of_requirement": date_of_req,
        "source_file": source_file,
    }


def parse_xlsx(file_content, filename=""):
    """Parse BOM from XLSX bytes. Returns list of BOM dicts."""
    wb = openpyxl.load_workbook(io.BytesIO(file_content), read_only=True, data_only=True)
    rows = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows(values_only=True):
            row = [None if c is None else str(c).strip() for c in row]
            if any(row):
                rows.append(row)
    if not rows:
        return []
    headers = _normalize_headers(rows[0])
    if not headers:
        return []
    result = []
    for row in rows[1:]:
        if not any(str(c).strip() for c in row if c is not None):
            continue
        result.append(_row_to_bom_dict(row, headers, filename))
    return result


def parse_csv(file_content, filename=""):
    """Parse BOM from CSV bytes. Returns list of BOM dicts."""
    try:
        text = file_content.decode("utf-8")
    except UnicodeDecodeError:
        text = file_content.decode("latin-1")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return []
    headers = _normalize_headers(rows[0])
    if not headers:
        return []
    result = []
    for row in rows[1:]:
        if not any(c and str(c).strip() for c in row):
            continue
        result.append(_row_to_bom_dict(row, headers, filename))
    return result


def parse_pdf(file_content, filename=""):
    """Parse BOM from PDF by extracting tables. Returns list of BOM dicts."""
    result = []
    with pdfplumber.open(io.BytesIO(file_content)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables or []:
                if not table:
                    continue
                headers = _normalize_headers(table[0])
                if not headers:
                    continue
                for row in table[1:]:
                    if not row or not any(str(c).strip() if c else "" for c in row):
                        continue
                    result.append(_row_to_bom_dict(row, headers, filename))
    return result


def parse_file(file_content, filename):
    """Dispatch to appropriate parser by extension. Returns list of BOM dicts."""
    ext = (filename or "").lower().split(".")[-1]
    if ext in ("xlsx", "xls"):
        return parse_xlsx(file_content, filename)
    if ext == "csv":
        return parse_csv(file_content, filename)
    if ext == "pdf":
        return parse_pdf(file_content, filename)
    raise ValueError(f"Unsupported format: {ext}. Use .xlsx, .csv, or .pdf")
