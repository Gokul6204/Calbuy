from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .models import UserProfile
from .serializers import RegistrationSerializer, UserProfileSerializer
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Q

import logging
logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_email = request.data.get("email") or ""
        normalized_email = str(raw_email).strip().lower()
        logger.info(f"Registration attempt for: {normalized_email}")
        payload = dict(request.data)
        payload["email"] = normalized_email
        serializer = RegistrationSerializer(data=payload)
        if serializer.is_valid():
            data = serializer.validated_data
            email = str(data["email"]).strip().lower()
            
            if User.objects.filter(username=email).exists():
                return Response({"error": "User with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                with transaction.atomic():
                    email = str(data.pop("email")).strip().lower()
                    password = data.pop('password')
                    user = User.objects.create_user(
                        username=email, 
                        email=email, 
                        password=password
                    )
                    UserProfile.objects.create(user=user, **data)
                
                # Auto-login after registration
                user = authenticate(request, username=email, password=password)
                if user:
                    login(request, user)
                    profile_serializer = UserProfileSerializer(user.profile)
                    return Response({
                        "message": "Registration successful",
                        "user": profile_serializer.data
                    }, status=status.HTTP_201_CREATED)
                
                return Response({"message": "Registered successfully. Please log in."}, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.error(f"Registration failed: {str(e)}", exc_info=True)
                return Response({"error": f"Registration failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.warning(f"Registration validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_email = request.data.get("email") or ""
        password = request.data.get("password")
        email = str(raw_email).strip().lower()
        logger.info(f"Login attempt for: {email}")

        if not email or not password:
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve exact username from case-insensitive lookup for legacy/mixed-case records.
        user_obj = User.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).first()
        username_for_auth = user_obj.username if user_obj else email
        user = authenticate(request, username=username_for_auth, password=password)
        
        if user:
            login(request, user)
            try:
                profile = user.profile
            except UserProfile.DoesNotExist:
                # Create a bare profile if it's missing for some reason
                profile = UserProfile.objects.create(user=user, organization_name="New Org")
                logger.warning(f"Created missing profile for user: {email}")
            
            serializer = UserProfileSerializer(profile)
            logger.info(f"Login successful for: {email}")
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        logger.warning(f"Login failed for: {email} - Invalid credentials")
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)

class ProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile_serializer = UserProfileSerializer(request.user.profile)
        return Response(profile_serializer.data)

    def put(self, request):
        profile = request.user.profile
        profile_serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if profile_serializer.is_valid():
            # Update User email if provided
            if 'email' in request.data:
                user = request.user
                user.email = request.data['email']
                user.username = request.data['email']
                user.save()
            
            profile_serializer.save()
            return Response(profile_serializer.data)
        return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(views.APIView):
    """
    Sets csrftoken cookie for SPA clients.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"message": "CSRF cookie set"})

