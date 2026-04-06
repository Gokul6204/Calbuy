from rest_framework import serializers

from .models import VendorDetails, VendorMaterialInfo


class VendorDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorDetails
        fields = ["id", "vendor_id", "vendor_name", "mobile_number", "email", "location", "address", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class VendorMaterialInfoSerializer(serializers.ModelSerializer):
    vendor_id = serializers.CharField(source="vendor.vendor_id", read_only=True)

    class Meta:
        model = VendorMaterialInfo
        fields = ["id", "vendor", "vendor_id", "part_number", "material", "created_at"]
        read_only_fields = ["id", "created_at", "vendor_id"]

