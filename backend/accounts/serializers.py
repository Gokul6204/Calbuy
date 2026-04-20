from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile
from Calbuy_procurement.geocoding import get_geocode

class RegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    organization_name = serializers.CharField(max_length=255)
    mail_id = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)

    def validate(self, data):
        # Trigger geocoding but don't fail registration if it fails
        try:
            lat, lng = get_geocode(
                data.get('address', ''),
                data.get('city', ''),
                data.get('state', ''),
                data.get('country', '')
            )
            data['latitude'] = lat
            data['longitude'] = lng
        except Exception as e:
            # Log the error but continue registration
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Geocoding failed during registration: {str(e)}")
            data['latitude'] = None
            data['longitude'] = None
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'organization_name', 'mail_id', 'address', 'city', 'state', 
            'country', 'phone_number', 'latitude', 'longitude', 'email'
        ]
        read_only_fields = ['latitude', 'longitude']

    def validate(self, data):
        # If any location field is changing, re-fetch coordinates
        address_fields = ['address', 'city', 'state', 'country']
        if any(field in data for field in address_fields):
            address = data.get('address', self.instance.address if self.instance else '')
            city = data.get('city', self.instance.city if self.instance else '')
            state = data.get('state', self.instance.state if self.instance else '')
            country = data.get('country', self.instance.country if self.instance else '')
            
            try:
                lat, lng = get_geocode(address, city, state, country)
                data['latitude'] = lat
                data['longitude'] = lng
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Geocoding failed during profile update: {str(e)}")
                # We don't overwrite existing coordinates if the current check fails
        return data
