from django.utils import timezone
from django.core.cache import cache
from accounts.models import User

class UpdateLastOnlineMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        if request.user.is_authenticated: 
            cache_key = f'last_online_{request.user.pk}'
            last_update = cache.get(cache_key)
            
            if not last_update:
                User.objects.filter(pk=request.user.pk).update(
                    last_online=timezone.now()
                )
                cache.set(cache_key, True, 300)
        
        return response