from django.db import models

class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Process Storage
    # For SQLite compatibility in older versions, we can use JSONField or TextField.
    # JSONField is available since Django 3.0+ for MariaDB/MySQL/PostgreSQL/SQLite (3.9.0+).
    last_matched_vendors = models.JSONField(null=True, blank=True)
    last_rfq_vendors = models.JSONField(null=True, blank=True)

    def __str__(self):
        return self.name
