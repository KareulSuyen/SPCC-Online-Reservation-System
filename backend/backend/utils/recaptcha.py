import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def verify_recaptcha(token):
    if not token:
        return False, "reCAPTCHA token is required"
    
    if not settings.RECAPTCHA_SECRET_KEY:
        logger.error("RECAPTCHA_SECRET_KEY not configured")
        return False, "reCAPTCHA configuration error"
    
    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': settings.RECAPTCHA_SECRET_KEY,
                'response': token
            },
            timeout=10
        )
        
        result = response.json()
        
        if result.get('success'):
            return True, None
        else:
            error_codes = result.get('error-codes', [])
            logger.warning(f"reCAPTCHA verification failed: {error_codes}")
            
            if 'timeout-or-duplicate' in error_codes:
                return False, "reCAPTCHA expired. Please try again."
            elif 'invalid-input-response' in error_codes:
                return False, "Invalid reCAPTCHA. Please try again."
            else:
                return False, "reCAPTCHA verification failed. Please try again."
                
    except requests.RequestException as e:
        logger.error(f"reCAPTCHA API request failed: {str(e)}")
        return False, "Unable to verify reCAPTCHA. Please try again."
    except Exception as e:
        logger.error(f"Unexpected error during reCAPTCHA verification: {str(e)}")
        return False, "An error occurred. Please try again."