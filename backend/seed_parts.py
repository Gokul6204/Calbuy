
import os
import django

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Calbuy_procurement.settings')
django.setup()

from bom.models import PartMaster

DATA = [
    ("WS", "WELDED STUD", "STEEL"),
    ("C", "CHANNEL", "STEEL"),
    ("L", "ANGLE", "STEEL"),
    ("PI", "PIPE", "STEEL"),
    ("HS", "BOLT", "BOLT/NUT"),
    ("HSS", "HOLLOW STRUCTURAL SECTION", "STEEL"),
    ("NUT", "NUT", "BOLT/NUT"),
    ("W", "WIDE FLANGE WIDE", "STEEL"),
    ("WT", "WTEE", "STEEL"),
    ("PL", "PLATE", "STEEL"),
]

def seed():
    for part, name, cat in DATA:
        obj, created = PartMaster.objects.update_or_create(
            part=part,
            defaults={"part_name": name, "category": cat}
        )
    print("Seeded PartMaster table.")

if __name__ == "__main__":
    seed()
