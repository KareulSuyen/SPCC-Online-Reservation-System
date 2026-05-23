from django.contrib.auth.backends import ModelBackend
from django.utils import timezone

class BanCheckBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        user = super().authenticate(request, username=username, password=password, **kwargs)
        
        if user is not None:
            if user.is_permanently_banned:
                return None
            
            if user.ban_until and user.ban_until > timezone.now():
                return None
            
            if user.ban_until and user.ban_until <= timezone.now():
                user.is_active = True
                user.ban_until = None
                user.ban_reason = ''
                user.save(update_fields=['is_active', 'ban_until', 'ban_reason'])
            
            if not user.is_active:
                return None
        
        return user
    
    def user_can_authenticate(self, user):
        is_active = getattr(user, 'is_active', None)
        is_permanently_banned = getattr(user, 'is_permanently_banned', None)
        ban_until = getattr(user, 'ban_until', None)
        
        if is_permanently_banned:
            return False
        
        if ban_until and ban_until > timezone.now():
            return False
        
        return is_active or is_active is None