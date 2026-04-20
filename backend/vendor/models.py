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
    address = models.TextField(blank=True, help_text="Building number, street name, area name")
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    full_address = models.TextField(blank=True, help_text="Combined address, city, state, country")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    distance_to_organization_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=100, blank=True, default="", help_text="Industry category (e.g., Fabrication, Castings)")

    def save(self, *args, **kwargs):
        parts = [self.address, self.city, self.state, self.country]
        self.full_address = ", ".join([str(p).strip() for p in parts if p and str(p).strip()])
        super().save(*args, **kwargs)
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
    part = models.CharField(max_length=255, default="General", help_text="Part identifier or name (e.g., HEA200)")
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def part_name(self):
        """Resolve full name from PartMaster."""
        from bom.models import PartMaster
        master = PartMaster.objects.filter(part__iexact=self.part.strip()).first()
        if master:
            return f"{master.part_name}({self.part.strip()})"
        return self.part

    class Meta:
        db_table = "vendor_material_info"
        ordering = ["-created_at"]
        verbose_name = "Vendor Material"
        verbose_name_plural = "Vendor Materials"

    def __str__(self):
        return f"{self.vendor.vendor_id}: {self.part}"

