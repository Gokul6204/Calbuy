"""
REST serializers for BOM.
"""

from rest_framework import serializers
from .models import BOM


class BOMSerializer(serializers.ModelSerializer):
    date_of_requirement = serializers.DateField(format="%Y-%m-%d", allow_null=True)

    class Meta:
        model = BOM
        fields = ["id", "bom_id", "part_number", "material", "quantity", "date_of_requirement", "source_file", "created_at"]
        read_only_fields = ["id", "created_at"]
