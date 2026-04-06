"""
BOM (Bill of Materials) model for procurement.
"""

from django.db import models
from project.models import Project


class BOM(models.Model):
    """Bill of Materials line item."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="bom_lines", null=True, blank=True)
    company_id = models.IntegerField(default=1, db_index=True) # Tenant ID
    bom_id = models.CharField(max_length=100, db_index=True, help_text="BOM identifier")
    part_number = models.CharField(max_length=100, blank=True, help_text="Part numbers from the file")
    material = models.CharField(max_length=255, help_text="Material description or code")
    quantity = models.DecimalField(
        max_digits=15,
        decimal_places=4,
        default=0,
        help_text="Required quantity",
    )
    date_of_requirement = models.DateField(
        null=True,
        blank=True,
        help_text="Date when material is required",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    source_file = models.CharField(max_length=255, blank=True, help_text="Original filename")

    class Meta:
        db_table = "bom"
        ordering = ["-created_at", "bom_id", "material"]
        verbose_name = "BOM Line"
        verbose_name_plural = "BOM Lines"

    def __str__(self):
        return f"{self.bom_id} - {self.material} ({self.quantity})"
