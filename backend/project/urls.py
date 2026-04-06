from django.urls import path
from . import views, portal_views

urlpatterns = [
    path('projects/', views.ProjectListCreateView.as_view(), name='project-list-create'),
    path('projects/<int:pk>/', views.ProjectDetailView.as_view(), name='project-detail'),
    path('projects/<int:project_id>/quotations/', views.ProjectQuotationListView.as_view()),
    
    # Vendor Portal URLs
    path('projects/<int:project_id>/portal-access/', portal_views.GeneratePortalAccessView.as_view()),
    path('portal/login/', portal_views.VendorPortalLoginView.as_view()),
    path('projects/<int:project_id>/vendors/<str:vendor_id>/items/', portal_views.RequiredItemsView.as_view()),
    path('projects/<int:project_id>/vendors/<str:vendor_id>/quotations/', portal_views.VendorQuotationView.as_view()),
]
