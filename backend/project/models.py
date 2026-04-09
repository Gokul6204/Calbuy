from django.db import models

class Project(models.Model):
    company_id = models.IntegerField(default=1, db_index=True) # Tenant ID
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Process Storage
    # For SQLite compatibility in older versions, we can use JSONField or TextField.
    # JSONField is available since Django 3.0+ for MariaDB/MySQL/PostgreSQL/SQLite (3.9.0+).
    last_matched_vendors = models.JSONField(null=True, blank=True)
    last_rfq_vendors = models.JSONField(null=True, blank=True)
    project_password = models.CharField(max_length=255, null=True, blank=True)

class ProjectVendorAccess(models.Model):
    """Credentials for multiple vendors per project."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="vendor_access")
    vendor_email = models.EmailField() 
    vendor_id = models.CharField(max_length=50) 
    access_password = models.CharField(max_length=255)
    sent_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('project', 'vendor_email')

class Quotation(models.Model):
    company_id = models.IntegerField(default=1, db_index=True) # Tenant ID
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    vendor_id = models.CharField(max_length=50) # Link by business ID
    bom_item_id = models.IntegerField(null=True, blank=True) # FK to BOMRecord
    material_name = models.CharField(max_length=255)
    
    price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="USD")
    count = models.IntegerField(null=True, blank=True)
    lead_time_days = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    attachment = models.FileField(upload_to='quotations/', null=True, blank=True)
    shipment_from_location = models.CharField(max_length=255, null=True, blank=True)
    submission_deadline = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "quotations"
