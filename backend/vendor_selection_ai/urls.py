from django.urls import path
from .views import VendorRankingView, TrainModelView, ConfirmVendorView

urlpatterns = [
    path('rank/', VendorRankingView.as_view(), name='vendor-rank'),
    path('train/', TrainModelView.as_view(), name='train-model'),
    path('confirm/', ConfirmVendorView.as_view(), name='confirm-vendor'),
]
