import os
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def load_slur_list(file_path='slur_list.txt'):
    slur_list = []
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(base_dir, file_path)
        
        if not os.path.exists(full_path):
            return get_default_slur_list()
            
        with open(full_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    slur_list.append(line.lower())
                    
        return slur_list
        
    except Exception as e:
        return get_default_slur_list()

def load_ai_prompts(file_path='ai_prompt.txt'):
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(base_dir, file_path)
        
        if not os.path.exists(full_path):
            return get_default_prompts()
            
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        prompts = {}
        current_section = None
        current_content = []
        
        for line in content.split('\n'):
            if line.strip().startswith('[') and line.strip().endswith(']'):
                if current_section:
                    prompts[current_section] = '\n'.join(current_content).strip()
                current_section = line.strip()[1:-1].lower()
                current_content = []
            elif current_section and not line.strip().startswith('#'):
                current_content.append(line)
                
        if current_section:
            prompts[current_section] = '\n'.join(current_content).strip()
            
        return prompts
        
    except Exception as e:
        return get_default_prompts()

def get_default_slur_list():
    return [
        'fuck', 'shit', 'bitch', 'ass', 'dick', 'pussy', 'cock', 'cunt',
        'kupal', 'gago', 'putang', 'bobo', 'tanga', 'tangina', 'puta',
        'sexy', 'horny', 'porn', 'sex', 'nude', 'tite', 'puke', 'kantot',
        'tarantado', 'ulol', 'siraulo', 'leche', 'yawa'
    ]

def get_default_prompts():
    return {
        'system_prompt': """You are a name validator for a school. Block offensive names with 'block'. Warn with 'soft-warning' if names don't match email (need 3+ character match). Users often swap first/last names - if both parts exist in email, it's OK. Always respond with valid JSON, if the user say.""",
        'user_prompt_template': """Validate this name:
- First Name: {first_name}
- Last Name: {last_name}
- Email: {email}{email_context}

Categorize: "block" (offensive), "soft-warning" (suspicious), "ok" (legitimate).
If BOTH names exist in email (even swapped), it's OK!
Respond with JSON: {{"hasIssue": true/false, "severity": "ok/soft-warning/block", "message": "Your message"}}"""
    }

def check_for_profanity(text, slur_list=None):
    if slur_list is None:
        slur_list = load_slur_list()
    text_lower = text.lower()
    return any(word in text_lower for word in slur_list)

def get_name_parts_from_email(email):
    try:
        if '@' not in email:
            return None
        username = email.split('@')[0]
        if '_' not in username:
            return None
        parts = username.split('_')
        return {
            'lastname': parts[0],
            'firstname': '_'.join(parts[1:])
        }
    except Exception:
        return None

class ValidateStudentNameView(APIView):
    
    def post(self, request):
        data = request.data
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        email = data.get('email', '').strip()

        if not first_name or not last_name or not email:
            return Response({
                "hasIssue": True,
                "severity": "soft-warning",
                "message": "First name, last name, and email are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        slur_list = load_slur_list()

        if check_for_profanity(first_name, slur_list) or check_for_profanity(last_name, slur_list):
            return Response({
                "hasIssue": True,
                "severity": "block",
                "message": "The name contains inappropriate content. Please use your real name."
            }, status=status.HTTP_200_OK)

        email_parts = get_name_parts_from_email(email)
        if not email_parts:
            return Response({
                "hasIssue": True,
                "severity": "soft-warning",
                "message": f"Invalid email format."
            }, status=status.HTTP_200_OK)

        first_match = any(part in email_parts['firstname'].lower() for part in first_name.lower().split())
        last_match = any(part in email_parts['lastname'].lower() for part in last_name.lower().split())

        if first_match and last_match:
            return Response({
                "hasIssue": False,
                "severity": "ok",
                "message": "Name validated successfully."
            }, status=status.HTTP_200_OK)
        elif first_match or last_match:
            return Response({
                "hasIssue": True,
                "severity": "soft-warning",
                "message": f"Partial name match. Please verify your name matches your email."
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "hasIssue": True,
                "severity": "soft-warning",
                "message": f"Your name does not match your email. Please enter your actual name."
            }, status=status.HTTP_200_OK)