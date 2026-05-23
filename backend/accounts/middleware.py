import logging
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

class BanCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG:
            logger.debug("\n=== BAN CHECK MIDDLEWARE ===")
            logger.debug(f"Path: {request.path}")
            logger.debug(f"Method: {request.method}")
            logger.debug(f"Has Auth Header: {'Authorization' in request.headers}")

        if not request.path.startswith('/api/'):
            if settings.DEBUG:
                logger.debug("Skipping - not API path")
            return self.get_response(request)
        
        jwt_auth = JWTAuthentication()
        try:
            auth_result = jwt_auth.authenticate(request)
            if settings.DEBUG:
                logger.debug(f"JWT Auth Result: {auth_result is not None}")

            if auth_result is not None:
                user, token = auth_result
                if settings.DEBUG:
                    logger.debug(f"User: {user.email}")
                    logger.debug(f"Is Superuser: {user.is_superuser}")
                    logger.debug(f"Is Permanently Banned: {user.is_permanently_banned}")
                    logger.debug(f"Ban Until: {user.ban_until}")
                    logger.debug(f"Is Active: {user.is_active}")

                if not user.is_superuser:
                    if user.is_permanently_banned:
                        return JsonResponse({
                            'error': 'Account permanently banned',
                            'detail': user.ban_reason or 'Your account has been permanently banned.',
                            'banned': True,
                            'permanent': True
                        }, status=403)
                    
                    if user.ban_until and user.ban_until > timezone.now():
                        return JsonResponse({
                            'error': 'Account temporarily banned',
                            'detail': user.ban_reason or 'Your account is temporarily banned.',
                            'banned': True,
                            'permanent': False,
                            'ban_until': user.ban_until.isoformat()
                        }, status=403)
                    
                    if user.ban_until and user.ban_until <= timezone.now():
                        user.is_active = True
                        user.ban_until = None
                        user.ban_reason = ''
                        user.save(update_fields=['is_active', 'ban_until', 'ban_reason'])
                    
                    if not user.is_active:
                        return JsonResponse({
                            'error': 'Account inactive',
                            'detail': 'Your account has been deactivated.',
                            'banned': True
                        }, status=403)
            else:
                if settings.DEBUG:
                    logger.debug("No JWT token found in request")

        except AuthenticationFailed as e:
            if settings.DEBUG:
                logger.warning(f"Authentication Failed: {str(e)}")
        except Exception as e:
            if settings.DEBUG:
                logger.error(f"Exception: {type(e).__name__}: {str(e)}")

        if settings.DEBUG:
            logger.debug("=== CONTINUING REQUEST ===\n")
        return self.get_response(request)
