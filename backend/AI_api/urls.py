from django.urls import path
from .views import AIAPIView, NameValidationView, CheckBanView, VerifyIDView

urlpatterns = [
    path('ai/', AIAPIView.as_view(), name='ai-endpoint'),
    path('validate-name/', NameValidationView.as_view(), name='validate-name'),
    path('check-ban/', CheckBanView.as_view(), name='check-ban'),
    path('verify-id/', VerifyIDView.as_view(), name='verify-id'),  
]