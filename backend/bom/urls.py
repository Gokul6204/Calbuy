"""
BOM API URL routes.
"""

from django.urls import path
from . import views

urlpatterns = [
    path("bom/upload/", views.BOMUploadView.as_view(), name="bom-upload"),
    path("bom/bulk-create/", views.BOMBulkCreateView.as_view(), name="bom-bulk-create"),
    path("bom/", views.BOMListView.as_view(), name="bom-list"),
    path("bom/<int:pk>/", views.BOMDetailView.as_view(), name="bom-detail"),
    path("part-master/", views.PartMasterListView.as_view(), name="part-master"),
]
