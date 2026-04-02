from django.contrib import admin
from .models import BOM


@admin.register(BOM)
class BOMAdmin(admin.ModelAdmin):
    list_display = ("bom_id", "material", "quantity", "date_of_requirement", "source_file", "created_at")
    list_filter = ("bom_id", "source_file")
    search_fields = ("bom_id", "material")
