from django.urls import path
from . import views
from .views import update_profile_picture


urlpatterns = [
    # Server pulse
    path('heartbeat/', views.heartbeat, name='heartbeat'),
    path('ping/', views.quick_ping, name='ping'),
    path('keep-alive-login/', views.keep_alive_login, name='keep-alive-login'),
    
    # Acc registration
    path('register/', views.RegisterView.as_view(), name='register'),
    path('verify-email/', views.verify_email, name='verify-email'),
    path('resend-verification/', views.resend_verification, name='resend-verification'),
    
    # Login && token
    path('login/', views.login, name='login'),
    path('token/refresh/', views.custom_token_refresh, name='token-refresh'),
    path('user/', views.get_user, name='get-user'),
    
    # Password Reset
    path('password-reset/', views.password_reset_request, name='password-reset-request'),
    path('password-reset-confirm/', views.password_reset_confirm, name='password-reset-confirm'),

    path('profile-picture/', update_profile_picture, name='update_profile_picture'),
    path('test-reservation-email/', views.test_reservation_email, name='test-reservation-email'),

    path('user-count/', views.get_user_count, name='user-count'),

]
