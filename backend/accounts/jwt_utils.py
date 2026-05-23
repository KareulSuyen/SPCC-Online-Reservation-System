from django.utils import timezone
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers

def custom_jwt_claims(token, user):
    if user.is_permanently_banned:
        raise serializers.ValidationError("Account is permanently banned")
    
    if user.ban_until and user.ban_until > timezone.now():
        raise serializers.ValidationError("Account is temporarily banned")
    
    token['email'] = user.email
    token['is_banned'] = user.is_permanently_banned
    
    return token

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        user = self.user
        
        if user:
            if user.is_permanently_banned:
                raise serializers.ValidationError({
                    'error': 'Account permanently banned',
                    'detail': user.ban_reason or 'Your account has been permanently banned.',
                })
            
            if user.ban_until and user.ban_until > timezone.now():
                raise serializers.ValidationError({
                    'error': 'Account temporarily banned',
                    'detail': user.ban_reason or 'Your account is temporarily banned.',
                    'ban_until': user.ban_until.isoformat()
                })
            
            if not user.is_active:
                raise serializers.ValidationError({
                    'error': 'Account inactive',
                    'detail': 'Your account has been deactivated.',
                })
        
        data = super().validate(attrs)
        return data
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        token['email'] = user.email
        token['is_banned'] = user.is_permanently_banned
        
        return token