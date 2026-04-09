"""
REST serializers for BOM.
"""

from rest_framework import serializers
from .models import BOM


class BOMSerializer(serializers.ModelSerializer):
    date_of_requirement = serializers.DateField(format="%Y-%m-%d", allow_null=True)
    selected_quotation_details = serializers.SerializerMethodField()

    class Meta:
        model = BOM
        fields = ["id", "bom_id", "part_number", "material", "quantity", "date_of_requirement", "source_file", "created_at", "selected_quotation", "selected_quotation_details"]
        read_only_fields = ["id", "created_at"]

    def get_selected_quotation_details(self, obj):
        if not obj.selected_quotation:
            return None
        q = obj.selected_quotation
        from vendor.models import VendorDetails
        vendor = VendorDetails.objects.filter(vendor_id=q.vendor_id).first()
        return {
            "vendor_id": q.vendor_id,
            "vendor_name": vendor.vendor_name if vendor else "Unknown",
            "vendor_email": vendor.email if vendor else "N/A",
            "vendor_address": vendor.address if vendor else "",
            "vendor_mobile": vendor.mobile_number if vendor else "N/A",
            "price": float(q.price) if q.price else 0,
            "lead_time_days": q.lead_time_days,
            "shipment_from_location": q.shipment_from_location or "Not specified"
        }
