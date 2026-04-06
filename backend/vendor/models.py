from django.db import models


class VendorDetails(models.Model):
    """
    Vendor master data.

    Note: we keep both an internal PK (`id`) and a business vendor id (`vendor_id`)
    that the user enters (unique).
    """

    company_id = models.IntegerField(default=1, db_index=True) # Tenant ID
    vendor_id = models.CharField(max_length=50, unique=True, db_index=True)
    vendor_name = models.CharField(max_length=255)
    mobile_number = models.CharField(max_length=20, blank=True, null=True, unique=True)
    email = models.EmailField(max_length=255, blank=True, null=True, unique=True)
    location = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vendor_details"
        ordering = ["vendor_id"]
        verbose_name = "Vendor"
        verbose_name_plural = "Vendors"

    def __str__(self):
        return f"{self.vendor_id} - {self.vendor_name}"


class VendorMaterialInfo(models.Model):
    """Materials linked to a vendor."""

    vendor = models.ForeignKey(
        VendorDetails,
        to_field="vendor_id",
        db_column="vendor_id",
        on_delete=models.CASCADE
    )
    part_number = models.CharField(max_length=100, blank=True, null=True)
    material = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "vendor_material_info"
        ordering = ["-created_at"]
        verbose_name = "Vendor Material"
        verbose_name_plural = "Vendor Materials"

    def __str__(self):
        return f"{self.vendor.vendor_id}: {self.material}"

