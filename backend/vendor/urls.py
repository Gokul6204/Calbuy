from django.urls import path

from . import views

urlpatterns = [
    path("vendors/", views.VendorListCreateView.as_view(), name="vendor-list"),
    path("vendors/<int:pk>/", views.VendorDetailView.as_view(), name="vendor-detail"),
    path(
        "vendors/<int:vendor_pk>/materials/",
        views.VendorMaterialListCreateView.as_view(),
        name="vendor-material-list",
    ),
    path("vendors/upload/", views.VendorUploadView.as_view(), name="vendor-upload"),
    path("vendors/match/", views.MatchVendorsView.as_view(), name="match-vendors"),
    path(
        "vendor-materials/<int:pk>/",
        views.VendorMaterialDetailView.as_view(),
        name="vendor-material-detail",
    ),
    path("vendors/send-rfq/", views.SendRfqEmailView.as_view(), name="send-rfq"),
]
