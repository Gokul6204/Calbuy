from django.contrib import admin
from .models import BOM


@admin.register(BOM)
class BOMAdmin(admin.ModelAdmin):
    list_display = ("part_number", "material", "quantity", "date_of_requirement", "source_file", "created_at")
    list_filter = ("source_file",)
    search_fields = ("part_number", "material")
