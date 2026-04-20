from rest_framework import serializers

from .models import VendorDetails, VendorMaterialInfo
from Calbuy_procurement.geocoding import get_geocode

class VendorDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorDetails
        fields = [
            "id", "company_id", "vendor_id", "vendor_name", 
            "mobile_number", "email", "address", "city", 
            "state", "country", "latitude", "longitude", 
            "category", "is_active", "created_at"
        ]
        read_only_fields = ["id", "company_id", "created_at", "latitude", "longitude"]

    def validate(self, data):
        # Trigger geocoding when address fields change or on creation
        address_fields = ['address', 'city', 'state', 'country']
        
        # Check if we are creating or updating address fields
        if not self.instance or any(field in data for field in address_fields):
            address = data.get('address', self.instance.address if self.instance else '')
            city = data.get('city', self.instance.city if self.instance else '')
            state = data.get('state', self.instance.state if self.instance else '')
            country = data.get('country', self.instance.country if self.instance else '')

            try:
                lat, lng = get_geocode(address, city, state, country)
                data['latitude'] = lat
                data['longitude'] = lng
            except ValueError as e:
                raise serializers.ValidationError({"location": str(e)})
        
        return data



class VendorMaterialInfoSerializer(serializers.ModelSerializer):
    vendor_id = serializers.CharField(source="vendor.vendor_id", read_only=True)

    class Meta:
        model = VendorMaterialInfo
        fields = ["id", "vendor", "vendor_id", "part", "part_name", "created_at"]
        read_only_fields = ["id", "created_at", "vendor_id", "part_name"]

