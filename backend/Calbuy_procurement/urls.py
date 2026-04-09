"""
URL configuration for Calby_procurement project.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("bom.urls")),
    path("api/", include("vendor.urls")),
    path("api/", include("project.urls")),
    path("api/accounts/", include("accounts.urls")),
    path("api/ai/", include("vendor_selection_ai.urls")),
]
