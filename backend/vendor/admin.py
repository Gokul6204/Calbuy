from django.contrib import admin

from .models import VendorDetails, VendorMaterialInfo


@admin.register(VendorDetails)
class VendorDetailsAdmin(admin.ModelAdmin):
    list_display = ("vendor_id", "vendor_name", "location", "created_at")
    search_fields = ("vendor_id", "vendor_name", "location")


@admin.register(VendorMaterialInfo)
class VendorMaterialInfoAdmin(admin.ModelAdmin):
    list_display = ("vendor", "material", "created_at")
    search_fields = ("vendor__vendor_id", "vendor__vendor_name", "material")
    list_select_related = ("vendor",)

