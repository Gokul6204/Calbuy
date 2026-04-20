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
        fields = [
            "id",
            "part_number",
            "part",
            "part_name",
            "category",
            "formatted_part",
            "size",
            "grade_name",
            "length_area",
            "material",
            "quantity",
            "quantity_type",
            "unit",
            "date_of_requirement",
            "source_file",
            "created_at",
            "selected_quotation",
            "selected_quotation_details",
            "po_issued",
        ]
        read_only_fields = ["id", "created_at"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Dynamic enrichment: ensure part_name and category are present even if not in DB
        if not ret.get("part_name") or not ret.get("category"):
            from .models import PartMaster
            master = PartMaster.objects.filter(part__iexact=instance.part).first()
            if master:
                if not ret.get("part_name"):
                    ret["part_name"] = master.part_name
                if not ret.get("category"):
                    ret["category"] = master.category
                # Always fix formatted_part if we resolved the name
                ret["formatted_part"] = f"{master.part_name}({instance.part})"
        return ret

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
            "currency": q.currency or "USD",
            "negotiation_percentage": float(q.negotiation_percentage) if q.negotiation_percentage else 0,
            "lead_time_days": q.lead_time_days,
            "shipment_from_location": q.shipment_from_location or q.shipment_address or "Not specified",
            "city": q.city,
            "state": q.state,
            "country": q.country,
            "distance_km": float(q.distance_to_organization_km) if q.distance_to_organization_km else 0
        }
