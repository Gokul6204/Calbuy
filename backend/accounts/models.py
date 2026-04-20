from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    organization_name = models.CharField(max_length=255)
    mail_id = models.CharField(max_length=255)
    address = models.TextField(blank=True, help_text="Building number, street name, area name")
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    full_address = models.TextField(blank=True, help_text="Combined address, city, state, country")
    phone_number = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def save(self, *args, **kwargs):
        # 1. Detect if any address fields have changed to trigger geocoding
        re_geocode = False
        if self.pk:
            try:
                old_instance = UserProfile.objects.get(pk=self.pk)
                if (old_instance.address != self.address or 
                    old_instance.city != self.city or 
                    old_instance.state != self.state or 
                    old_instance.country != self.country):
                    re_geocode = True
            except UserProfile.DoesNotExist:
                re_geocode = True
        else:
            re_geocode = True

        # 2. Update the full_address helper field
        parts = [self.address, self.city, self.state, self.country]
        self.full_address = ", ".join([str(p).strip() for p in parts if p and str(p).strip()])
        
        # 3. If location changed or is new, fetch fresh coordinates
        if re_geocode and any(parts):
            from Calbuy_procurement.geocoding import get_geocode
            try:
                lat, lon = get_geocode(
                    self.address or '', 
                    self.city or '', 
                    self.state or '', 
                    self.country or ''
                )
                if lat and lon:
                    self.latitude = lat
                    self.longitude = lon
            except Exception:
                # Silently skip if geocoding fails, but keep existing coordinates
                pass

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username}'s Profile"

