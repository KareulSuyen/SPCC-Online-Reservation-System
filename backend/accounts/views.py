from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, login as django_login
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
import re
from django.http import HttpResponse, JsonResponse
from django.db import connection
import time
import os
import cloudinary.uploader
from backend.utils.recaptcha import verify_recaptcha
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_count(request):

    total_users = User.objects.filter(
        is_email_verified=True,
        is_active=True,
        is_staff=False,
        is_superuser=False
    ).count()
    
    return Response({
        'total_users': total_users
    })

from .email_templates import (
    VERIFICATION_EMAIL_TEMPLATE,
    PASSWORD_RESET_TEMPLATE,
    RESEND_VERIFICATION_TEMPLATE,
    RESERVATION_CONFIRMATION_TEMPLATE 
)

from .email_utils import (
    send_email_via_brevo_api,
    send_email_async,
    send_reservation_confirmation_email  
)

from .serializers import (
    RegisterSerializer, UserSerializer, 
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    ProfilePictureUpdateSerializer
)

User = get_user_model()

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def heartbeat(request):
    return JsonResponse({
        'status': 'alive',
        'timestamp': timezone.now().isoformat(),
        'message': 'Server is awake'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def quick_ping(request):
    start_time = time.time()
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        response_time_ms = (time.time() - start_time) * 1000
        
        return JsonResponse({
            'pong': True,
            'time': timezone.now().isoformat(),
            'db_connected': True,
            'response_time_ms': round(response_time_ms, 2)
        })
    except Exception as e:
        return JsonResponse({
            'pong': False,
            'error': str(e),
            'time': timezone.now().isoformat()
        }, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def keep_alive_login(request):
    import logging
    logger = logging.getLogger(__name__)
    
    keepalive_email = os.getenv('KEEP_ALIVE_BOT_EMAIL')
    keepalive_password = os.getenv('KEEP_ALIVE_BOT_PASSWORD')
    
    email = request.data.get('email', '')
    password = request.data.get('password', '')
    
    is_keepalive = (email == keepalive_email and password == keepalive_password)
    
    if is_keepalive:
        try:
            start_time = time.time()
            
            logger.info("="*60)
            logger.info("GitHub ping received")
            logger.info(f"Time: {timezone.now().isoformat()}")
            
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            logger.info("Database connection: ✓")
            
            cache_key = f"keepalive_ping_{int(time.time())}"
            cache.set(cache_key, 'pong', 30)
            cache_result = cache.get(cache_key)
            logger.info(f"Cache connection: {'✓' if cache_result == 'pong' else '✗'}")
            
            response_time_ms = (time.time() - start_time) * 1000
            logger.info(f"Response time: {response_time_ms:.2f}ms")
            logger.info("All systems operational")
            logger.info("="*60)
            
            return JsonResponse({
                'status': 'keepalive_success',
                'message': 'Keep-alive login processed',
                'timestamp': timezone.now().isoformat(),
                'response_time_ms': round(response_time_ms, 2),
                'db_active': True,
                'cache_active': cache_result == 'pong',
                'auth_system_active': True
            })
        except Exception as e:
            logger.error(f"Err: {str(e)}")
            logger.error("="*60)
            return JsonResponse({
                'status': 'keepalive_error',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=500)
    
    logger.warning(f"Invalid request from {email}")
    return JsonResponse({
        'error': 'Invalid request'
    }, status=status.HTTP_400_BAD_REQUEST)

def validate_password_strength(password):
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    if len(password) > 128:
        return False, "Password must not exceed 128 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    return True, None


@api_view(['POST'])
@permission_classes([AllowAny])
def test_email_config(request):
    try:
        recipient = request.data.get('email', 'spccors@gmail.com')
        
        print("\n" + "="*60)
        print("Testing Brevo API")
        print("="*60)
        print(f"Recipient: {recipient}")
        print(f"From: {settings.DEFAULT_FROM_EMAIL}")
        print("="*60 + "\n")

        success, message = send_email_via_brevo_api(
            to_email=recipient,
            subject='SPCC ORS',
        )
        
        if success:
            return Response({
                "success": True,
                "message": "Test email sent successfully via Brevo API",
                "recipient": recipient,
                "from": settings.DEFAULT_FROM_EMAIL,
                "method": "Brevo REST API",
                "note": "Check your inbox and spam folder"
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": False,
                "error": "Failed to send test email",
                "detail": message,
                "method": "Brevo REST API"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        print(f"[EMAIL TEST] Error: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        
        return Response({
            "success": False,
            "error": "Failed to send test email",
            "detail": str(e),
            "type": type(e).__name__
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_email_config(request):
    import os
    
    config = {
        "method": "Brevo REST API",
        "default_from": settings.DEFAULT_FROM_EMAIL,
        "debug_mode": settings.DEBUG,
        "brevo_api_key_set": bool(os.getenv('BREVO_API_KEY')),
        "requests_installed": True
    }
    
    issues = []
    if not settings.DEFAULT_FROM_EMAIL:
        issues.append("DEFAULT_FROM_EMAIL is not set")
    if not os.getenv('BREVO_API_KEY'):
        issues.append("BREVO_API_KEY environment variable is not set")
    
    return Response({
        "configuration": config,
        "issues": issues,
        "status": "OK" if not issues else "WARNING"
    }, status=status.HTTP_200_OK)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        recaptcha_token = request.data.get('recaptcha_token')
        is_valid, error_message = verify_recaptcha(recaptcha_token)
        
        if not is_valid:
            return Response({
                "error": error_message or 'reCAPTCHA verification failed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        password = request.data.get('password')
        is_valid, error_message = validate_password_strength(password)
        
        if not is_valid:
            return Response({
                "error": error_message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = request.data.get('email')
        
        existing_user = User.objects.filter(email=email, is_email_verified=False).first()
        if existing_user:
            existing_user.delete()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        token = user.generate_verification_token()
        verification_link = f"{settings.FRONTEND_URL}/verify-email/{token}"
        
        print(f"Sending verification email to {user.email}")
        
        send_email_async(
            to_email=user.email,
            subject='Verify your SPCC email address',
            html_content=VERIFICATION_EMAIL_TEMPLATE.format(verification_link=verification_link),
            text_content=f'''Welcome to SPCC Online Reservation System!

Please verify your email address by clicking the link below:
{verification_link}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.'''
        )
        
        return Response({
            "message": "Registration successful. Please check your email to verify your account.",
            "email": user.email
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    token = request.data.get('token')
    
    if not token:
        return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email_verification_token=token)
        
        user.is_email_verified = True
        user.is_active = True
        user.email_verification_token = None
        user.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "message": "Email verified successfully",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    email = request.data.get('email')
    
    if not email or not email.endswith('@spcc.edu.ph'):
        return Response({"error": "Valid SPCC email is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        
        if user.is_email_verified:
            return Response({"error": "Email is already verified"}, status=status.HTTP_400_BAD_REQUEST)
        
        token = user.generate_verification_token()
        verification_link = f"{settings.FRONTEND_URL}/verify-email/{token}"
        
        print(f"[RESEND] Sending verification email to {user.email}")
        
        send_email_async(
            to_email=user.email,
            subject='Verify your SPCC email address',
            html_content=RESEND_VERIFICATION_TEMPLATE.format(verification_link=verification_link),
            text_content=f'Here is your new verification link:\n{verification_link}\n\nThis link will expire in 24 hours.'
        )
        
        return Response({"message": "Verification email resent successfully"}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "No account found with this email. Please register first."}, status=status.HTTP_404_NOT_FOUND)

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def check_rate_limit(email, ip_address):
    cache_key = f"login_attempts_{email}_{ip_address}"
    attempts = cache.get(cache_key, 0)
    
    if attempts >= 5:
        ban_key = f"login_ban_{email}_{ip_address}"
        ban_time = cache.get(ban_key)
        if ban_time:
            time_left = ban_time - timezone.now()
            if time_left.total_seconds() > 0:
                minutes = int(time_left.total_seconds() // 60)
                seconds = int(time_left.total_seconds() % 60)
                return True, f"Too many failed attempts. Please try again in {minutes}m {seconds}s"
            else:
                cache.delete(cache_key)
                cache.delete(ban_key)
                return False, None
    
    return False, None

def record_failed_attempt(email, ip_address):
    cache_key = f"login_attempts_{email}_{ip_address}"
    attempts = cache.get(cache_key, 0) + 1
    
    cache.set(cache_key, attempts, 300)
    
    if attempts >= 5:
        ban_key = f"login_ban_{email}_{ip_address}"
        ban_until = timezone.now() + timedelta(minutes=5)
        cache.set(ban_key, ban_until, 300)
        return attempts, True
    
    return attempts, False

def clear_failed_attempts(email, ip_address):
    cache_key = f"login_attempts_{email}_{ip_address}"
    ban_key = f"login_ban_{email}_{ip_address}"
    cache.delete(cache_key)
    cache.delete(ban_key)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    recaptcha_token = request.data.get('recaptcha_token')
    is_valid, error_message = verify_recaptcha(recaptcha_token)
    
    if not is_valid:
        return Response({
            'error': error_message or 'reCAPTCHA verification failed'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not email.endswith('@spcc.edu.ph'):
        return Response({"error": "Only @spcc.edu.ph email addresses are allowed"}, status=status.HTTP_400_BAD_REQUEST)
    
    ip_address = get_client_ip(request)
    
    is_banned, ban_message = check_rate_limit(email, ip_address)
    if is_banned:
        return Response({
            "error": ban_message,
            "locked": True,
            "retry_after": 300
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    try:
        user = User.objects.get(email=email)
        
        if not user.is_email_verified and not (user.is_staff or user.is_superuser):
            return Response({
                "error": "Please verify your email before logging in. Check your inbox for the verification link.",
                "email_not_verified": True,
                "can_resend": True
            }, status=status.HTTP_403_FORBIDDEN)
                
        if user.is_permanently_banned:
            return Response({
                "error": "Account permanently banned",
                "detail": user.ban_reason or "Your account has been permanently banned.",
                "banned": True,
                "permanent": True
            }, status=status.HTTP_403_FORBIDDEN)
        
        if user.ban_until and user.ban_until > timezone.now():
            ban_date = user.ban_until.strftime('%Y-%m-%d %H:%M')
            return Response({
                "error": "Account temporarily banned",
                "detail": f"Your account is banned until {ban_date}. " + (user.ban_reason or ""),
                "banned": True,
                "permanent": False,
                "ban_until": user.ban_until.isoformat()
            }, status=status.HTTP_403_FORBIDDEN)
        
        if user.ban_until and user.ban_until <= timezone.now():
            user.is_active = True
            user.ban_until = None
            user.ban_reason = ''
            user.save(update_fields=['is_active', 'ban_until', 'ban_reason'])
                
        if not user.check_password(password):
            attempts, is_now_banned = record_failed_attempt(email, ip_address)
            
            if is_now_banned:
                return Response({
                    "error": "Too many failed login attempts. Your account has been temporarily locked for 5 minutes.",
                    "locked": True,
                    "retry_after": 300
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            remaining_attempts = 5 - attempts
            return Response({
                "error": f"Incorrect password. You have {remaining_attempts} attempt{'s' if remaining_attempts != 1 else ''} remaining.",
                "attempts_remaining": remaining_attempts
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response({
                "error": "Your account is not active. Please contact support.",
                "email_not_verified": False
            }, status=status.HTTP_403_FORBIDDEN)
        
        if user.is_staff or user.is_superuser:
            clear_failed_attempts(email, ip_address)
            django_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            refresh = RefreshToken.for_user(user)
            admin_url = request.build_absolute_uri('/admin/')
            
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "is_admin": True,
                "redirect_to": admin_url
            }, status=status.HTTP_200_OK)
        
        clear_failed_attempts(email, ip_address)
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "is_admin": False
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        attempts, is_now_banned = record_failed_attempt(email, ip_address)
        
        if is_now_banned:
            return Response({
                "error": "Too many failed login attempts. Your account has been temporarily locked for 5 minutes.",
                "locked": True,
                "retry_after": 300
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        remaining_attempts = 5 - attempts
        return Response({
            "error": f"Invalid credentials. You have {remaining_attempts} attempt{'s' if remaining_attempts != 1 else ''} remaining.",
            "attempts_remaining": remaining_attempts
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    recaptcha_token = request.data.get('recaptcha_token')
    is_valid, error_message = verify_recaptcha(recaptcha_token)
    
    if not is_valid:
        return Response({
            'error': error_message or 'reCAPTCHA verification failed'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    email = serializer.validated_data['email']
    
    try:
        user = User.objects.get(email=email)
        if not user.is_active or not user.is_email_verified:
            return Response({
                "error": "Please verify your email before requesting a password reset"
            }, status=status.HTTP_403_FORBIDDEN)
        
        token = user.generate_password_reset_token()
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
        
        print(f"[PASSWORD RESET] Sending reset email to {user.email}")
        
        send_email_async(
            to_email=user.email,
            subject='Reset your SPCC password',
            html_content=PASSWORD_RESET_TEMPLATE.format(reset_link=reset_link),
            text_content=f'''You requested to reset your password.

Click the link below to reset it:
{reset_link}

This link will expire in 24 hours.

If you did not request this, please ignore this email.'''
        )
        
        return Response({"message": "Password reset link sent to your email"}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"message": "If an account exists with this email, a password reset link has been sent"}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    token = serializer.validated_data['token']
    password = serializer.validated_data['password']
    
    is_valid, error_message = validate_password_strength(password)
    
    if not is_valid:
        return Response({
            "error": error_message
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(password_reset_token=token)
        
        if user.password_reset_expires < timezone.now():
            return Response({"error": "Token has expired"}, status=status.HTTP_400_BAD_REQUEST)
        
        if user.check_password(password):
            return Response({
                "error": "New password cannot be the same as your old password"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(password)
        user.password_reset_token = None
        user.password_reset_expires = None
        user.save()
        
        return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def custom_token_refresh(request):
    from rest_framework_simplejwt.tokens import RefreshToken
    
    refresh_token = request.data.get('refresh')
    
    if not refresh_token:
        return Response({'error': 'Email or Password are incorrect!'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        token = RefreshToken(refresh_token)
        user_id = token.payload.get('user_id')
        
        if user_id:
            user = User.objects.get(id=user_id)
            
            if user.is_permanently_banned:
                return Response({
                    'error': 'Account permanently banned',
                    'detail': user.ban_reason or 'Your account has been permanently banned.',
                    'banned': True,
                    'permanent': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            if user.ban_until and user.ban_until > timezone.now():
                return Response({
                    'error': 'Account temporarily banned',
                    'detail': user.ban_reason or 'Your account is temporarily banned.',
                    'banned': True,
                    'permanent': False,
                    'ban_until': user.ban_until.isoformat()
                }, status=status.HTTP_403_FORBIDDEN)
            
            if user.ban_until and user.ban_until <= timezone.now():
                user.is_active = True
                user.ban_until = None
                user.ban_reason = ''
                user.save(update_fields=['is_active', 'ban_until', 'ban_reason'])
            
            if not user.is_active:
                return Response({
                    'error': 'Account inactive',
                    'detail': 'Your account has been deactivated.',
                    'banned': True
                }, status=status.HTTP_403_FORBIDDEN)
        
        token.set_exp()
        return Response({
            'access': str(token.access_token),
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_profile_picture(request):
    user = request.user
    
    if request.method == 'POST':
        if 'profile_picture' not in request.FILES:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ProfilePictureUpdateSerializer(
            user,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            if user.profile_picture and not settings.DEBUG:
                try:
                    public_id = user.profile_picture.name
                    if 'profile_pictures/' in public_id:
                        cloudinary.uploader.destroy(public_id)
                        print(f"Deleted old image: {public_id}")
                except Exception as e:
                    print(f"Error deleting old image: {e}")
            
            serializer.save()
            print(f"Profile picture updated for user: {user.email}")
            
            return Response({
                'message': 'Profile picture updated successfully',
                'profile_picture_url': serializer.data['profile_picture_url']
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if user.profile_picture:
            if not settings.DEBUG:
                try:
                    public_id = user.profile_picture.name
                    if 'profile_pictures/' in public_id:
                        cloudinary.uploader.destroy(public_id)
                        print(f"Deleted image: {public_id}")
                except Exception as e:
                    print(f"Error deleting image: {e}")
            
            user.profile_picture.delete()
            user.save()
            print(f"Profile picture removed for user: {user.email}")
        
        return Response({
            'message': 'Profile picture removed successfully',
            'profile_picture_url': user.get_gmail_picture_url()
        }, status=status.HTTP_200_OK)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_reservation_email(request):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from core_api.models import Reservation
        from accounts.email_utils import send_reservation_confirmation_email
        
        reservation = Reservation.objects.filter(user=request.user).order_by('-created_at').first()
        
        if not reservation:
            return Response({
                'error': 'No reservations found for your account'
            }, status=status.HTTP_404_NOT_FOUND)
        
        logger.info(f"Testing email for reservation #{reservation.id}")
        
        success, message = send_reservation_confirmation_email(reservation)
        
        if success:
            return Response({
                'success': True,
                'message': 'Test email sent successfully',
                'reservation_id': reservation.id,
                'sent_to': request.user.email
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': message,
                'reservation_id': reservation.id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error in test_reservation_email: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        return Response({
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)