from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings

class CustomAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        return True
    
    def clean_email(self, email):
        if not email.endswith('@spcc.edu.ph'):
            raise ValueError("Only @spcc.edu.ph email addresses are allowed.")
        return email
    
    def get_user_search_fields(self):
        return ['email', 'first_name', 'last_name']