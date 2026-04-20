from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("organization_name", "city", "country", "phone_number")
    search_fields = ("organization_name", "city", "country")

