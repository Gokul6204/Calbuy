"""
BOM (Bill of Materials) model for procurement.
"""

from django.db import models
from project.models import Project


class PartMaster(models.Model):
    """Mapping of part short codes to full names and categories."""
    part = models.CharField(max_length=100, unique=True, db_index=True)
    part_name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)

    class Meta:
        db_table = "part_master"

    def __str__(self):
        return f"{self.part} -> {self.part_name} ({self.category})"


class BOM(models.Model):
    """Bill of Materials line item."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="bom_lines", null=True, blank=True)
    company_id = models.IntegerField(default=1, db_index=True) # Tenant ID
    part_number = models.CharField(max_length=100, blank=True, help_text="Part numbers from the file")
    part = models.CharField(max_length=100, blank=True, help_text="BOM part/type (e.g. WS, C, L)")
    part_name = models.CharField(max_length=255, blank=True, null=True, help_text="Full name (e.g. WELDED STEEL)")
    category = models.CharField(max_length=100, blank=True, null=True, help_text="Part category (e.g. STEEL, BOLT/NUT)")
    size = models.CharField(max_length=100, blank=True, help_text="BOM size")
    grade_name = models.CharField(max_length=255, blank=True, help_text="BOM Grade/material Grade")
    length_area = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        default=0,
        help_text="Length or area quantity based on part",
    )
    material = models.CharField(max_length=255, help_text="Material description or code")
    quantity = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        default=0,
        help_text="Required quantity",
    )
    quantity_type = models.CharField(max_length=50, blank=True, help_text="Type of quantity (Area, Length, Count)")
    unit = models.CharField(max_length=50, blank=True, help_text="Unit of measurement")
    date_of_requirement = models.DateField(
        null=True,
        blank=True,
        help_text="Date when material is required",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    source_file = models.CharField(max_length=255, blank=True, help_text="Original filename")
    
    # Selection Tracking
    selected_quotation = models.ForeignKey('project.Quotation', on_delete=models.SET_NULL, null=True, blank=True, related_name="confirmed_on_bom")
    po_issued = models.BooleanField(default=False)

    class Meta:
        db_table = "bom"
        ordering = ["-created_at", "material"]
        verbose_name = "BOM Line"
        verbose_name_plural = "BOM Lines"

    def __str__(self):
        return f"{self.part_number} - {self.material} ({self.quantity})"

    @property
    def formatted_part(self):
        """Returns [PARTNAME(PART)] as requested."""
        if self.part_name and self.part:
            return f"{self.part_name}({self.part})"
        return self.part or "N/A"
