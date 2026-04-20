from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from .views import VendorRankingView, TrainModelView, ConfirmVendorView

urlpatterns = [
    path('rank/', csrf_exempt(VendorRankingView.as_view()), name='vendor-rank'),
    path('train/', csrf_exempt(TrainModelView.as_view()), name='train-model'),
    path('confirm/', csrf_exempt(ConfirmVendorView.as_view()), name='confirm-vendor'),
]
