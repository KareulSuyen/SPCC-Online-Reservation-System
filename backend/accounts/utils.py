from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

def cleanup_unverified_accounts():
    cutoff_time = timezone.now() - timedelta(hours=24)
    deleted_count = User.objects.filter(
        is_email_verified=False,
        is_active=False,
        date_joined__lt=cutoff_time
    ).delete()
    return deleted_count

