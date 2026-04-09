from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .models import UserProfile
from django.db import transaction

class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        email = data.get('email')
        password = data.get('password')
        org_name = data.get('organization_name')
        org_location = data.get('organization_location')
        phone = data.get('phone_number')

        if not all([email, password, org_name, org_location, phone]):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=email).exists():
            return Response({"error": "User with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = User.objects.create_user(username=email, email=email, password=password)
                UserProfile.objects.create(
                    user=user,
                    organization_name=org_name,
                    organization_location=org_location,
                    phone_number=phone
                )
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, username=email, password=password)
        
        if user:
            login(request, user)
            profile = user.profile
            return Response({
                "email": user.email,
                "organization_name": profile.organization_name,
                "organization_location": profile.organization_location,
                "phone_number": profile.phone_number
            }, status=status.HTTP_200_OK)
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)

class ProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = user.profile
        return Response({
            "email": user.email,
            "organization_name": profile.organization_name,
            "organization_location": profile.organization_location,
            "phone_number": profile.phone_number
        })

    def put(self, request):
        user = request.user
        profile = user.profile
        data = request.data

        # Update User fields if needed (e.g. email)
        if 'email' in data:
            user.email = data['email']
            user.username = data['email']
            user.save()

        # Update Profile fields
        profile.organization_name = data.get('organization_name', profile.organization_name)
        profile.organization_location = data.get('organization_location', profile.organization_location)
        profile.phone_number = data.get('phone_number', profile.phone_number)
        profile.save()

        return Response({
            "email": user.email,
            "organization_name": profile.organization_name,
            "organization_location": profile.organization_location,
            "phone_number": profile.phone_number
        })
