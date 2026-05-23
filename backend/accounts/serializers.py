from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'password2', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
            'password': {'required': True},
            'password2': {'required': True},
        }
    
    def validate_email(self, value):
        if not value.endswith('@spcc.edu.ph'):
            raise serializers.ValidationError("Only @spcc.edu.ph email addresses are allowed.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            is_active=False  
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'is_email_verified', 'profile_picture', 'profile_picture_url')
        read_only_fields = ('id', 'is_email_verified', 'profile_picture_url')
    
    def get_profile_picture_url(self, obj):
        return obj.get_gmail_picture_url()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not value.endswith('@spcc.edu.ph'):
            raise serializers.ValidationError("Only @spcc.edu.ph email addresses are allowed.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs


class CustomLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            try:
                user = User.objects.get(email=email)
                
                if user.is_permanently_banned:
                    raise serializers.ValidationError({
                        'non_field_errors': ['Account permanently banned. ' + (user.ban_reason or 'Your account has been permanently banned.')]
                    })
                
                if user.ban_until and user.ban_until > timezone.now():
                    ban_date = user.ban_until.strftime('%Y-%m-%d %H:%M')
                    raise serializers.ValidationError({
                        'non_field_errors': [f'Account temporarily banned until {ban_date}. ' + (user.ban_reason or '')]
                    })
                
                if user.ban_until and user.ban_until <= timezone.now():
                    user.is_active = True
                    user.ban_until = None
                    user.ban_reason = ''
                    user.save(update_fields=['is_active', 'ban_until', 'ban_reason'])
                
                if not user.is_active:
                    raise serializers.ValidationError({
                        'non_field_errors': ['Account is inactive. Please contact support.']
                    })
                
                user = authenticate(
                    request=self.context.get('request'),
                    email=email,
                    password=password
                )
                
                if not user:
                    raise serializers.ValidationError({
                        'non_field_errors': ['Unable to log in with provided credentials.']
                    })
                    
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'non_field_errors': ['Unable to log in with provided credentials.']
                })
        else:
            raise serializers.ValidationError({
                'non_field_errors': ['Must include "email" and "password".']
            })

        attrs['user'] = user
        return attrs


class CustomRegisterSerializer(RegisterSerializer):
    pass


class ProfilePictureUpdateSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['profile_picture', 'profile_picture_url']
        read_only_fields = ['profile_picture_url']
    
    def get_profile_picture_url(self, obj):
        return obj.get_gmail_picture_url()
