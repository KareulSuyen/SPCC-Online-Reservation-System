import uuid
from datetime import timedelta
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from urllib.parse import quote
from django.conf import settings

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_email_verified', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    
    profile_picture = models.ImageField(
        upload_to='profile_pictures/', 
        blank=True, 
        null=True,
        help_text="User profile picture"
    )
    
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    password_reset_token = models.CharField(max_length=100, blank=True, null=True)
    password_reset_expires = models.DateTimeField(blank=True, null=True)

    last_online = models.DateTimeField(null=True, blank=True)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    
    ban_until = models.DateTimeField(blank=True, null=True, help_text="Temporary ban until this date")
    ban_reason = models.TextField(blank=True, help_text="Reason for the ban")
    is_permanently_banned = models.BooleanField(default=False, help_text="Permanent ban flag")

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email

    def generate_verification_token(self):
        self.email_verification_token = str(uuid.uuid4())
        self.save(update_fields=['email_verification_token'])
        return self.email_verification_token
    
    def generate_password_reset_token(self):
        self.password_reset_token = str(uuid.uuid4())
        self.password_reset_expires = timezone.now() + timedelta(hours=24)
        self.save(update_fields=['password_reset_token', 'password_reset_expires'])
        return self.password_reset_token
    
    def is_banned(self):
        if self.is_permanently_banned:
            return True
        if self.ban_until and self.ban_until > timezone.now():
            return True
        if self.ban_until and self.ban_until <= timezone.now():
            self.is_active = True
            self.ban_until = None
            self.save(update_fields=['is_active', 'ban_until'])
        return False
    
    def get_gmail_picture_url(self):
        if self.profile_picture:
            if settings.DEBUG:
                return self.profile_picture.url
            else:
                return self.profile_picture.url
        
        if self.first_name and self.last_name:
            name = quote(f"{self.first_name} {self.last_name}")
            import hashlib
            email_hash = hashlib.md5(self.email.encode()).hexdigest()
            bg_color = email_hash[:6]
            return f"https://ui-avatars.com/api/?name={name}&background={bg_color}&color=fff&size=200&bold=true"
        
        return "https://ui-avatars.com/api/?name=User&background=4a5568&color=fff&size=200"
