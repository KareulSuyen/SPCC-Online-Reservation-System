from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.core.mail import send_mail, BadHeaderError
import requests
import json
import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import os
from django.core.cache import cache
from datetime import datetime, timedelta
import re  
import time
import google.generativeai as genai
import base64
from PIL import Image
import io
import sys

logger = logging.getLogger(__name__)

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

SLUR_LIST = None
AI_PROMPTS = None

try:
    from ..utils.slur_utils import load_slur_list, load_ai_prompts, check_for_profanity
    SLUR_LIST = load_slur_list()
    AI_PROMPTS = load_ai_prompts()
except ImportError:
    try:
        from utils.slur_utils import load_slur_list, load_ai_prompts, check_for_profanity
        SLUR_LIST = load_slur_list()
        AI_PROMPTS = load_ai_prompts()
    except ImportError:
        logger.warning("Could not import slur_utils")
        SLUR_LIST = None
        AI_PROMPTS = None

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET", "POST"])
def test_endpoint(request):
    return JsonResponse({
        'message': 'Test endpoint is working!',
        'method': request.method,
        'status': 'success'
    })

ai_secret = os.getenv('AI_SECRETS')
site_infos = os.getenv('SITE_INFOS')

@method_decorator(csrf_exempt, name='dispatch')
class AIAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):        
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        user_prompt = request.data.get('prompt', 'test')
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.AI_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": f"{ai_secret} {site_infos}"
                },
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 300
        }
    
        try:
            response = requests.post(
                f"{settings.AI_API_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 401:
                return Response({
                    "error": "Groq API Key is invalid or expired",
                    "suggestion": "Check your key in .env file",
                    "response": response.text
                }, status=400)
            
            if response.status_code == 200:
                data = response.json()
                return Response({"response": data["choices"][0]["message"]["content"]})
            else:
                return Response({"error": f"Groq error: {response.text}"}, status=400)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class CheckBanView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        
        if not ip or ip == '':
            ip = 'unknown'
        
        return ip
    
    def get(self, request):
        client_ip = self.get_client_ip(request)
        ban_key = f'registration_ban_{client_ip}'
        ban_data = cache.get(ban_key)
        
        if ban_data:
            ban_until = ban_data.get('ban_until', 0)
            current_time = time.time()
            time_remaining = int(ban_until - current_time)
            
            if time_remaining > 0:
                minutes_remaining = time_remaining // 60
                return Response({
                    "banned": True,
                    "timeRemaining": time_remaining,
                    "banUntil": ban_until,
                    "message": f"Too many inappropriate registration attempts. Please try again in {minutes_remaining} minute(s)."
                })
            else:
                cache.delete(ban_key)
                cache.delete(f'registration_attempts_{client_ip}')
        
        return Response({"banned": False})

@method_decorator(csrf_exempt, name='dispatch')
class NameValidationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def normalize_name(self, name):
        return re.sub(r'[^a-z]', '', name.lower())
    
    def check_name_match(self, first_name, last_name, email):
        if '@' not in email:
            return False
        
        email_username = email.split('@')[0].lower()
        if '_' not in email_username:
            return False
        
        parts = email_username.split('_')
        email_lastname = parts[0]
        email_firstname = '_'.join(parts[1:])
        
        first_normalized = self.normalize_name(first_name)
        last_normalized = self.normalize_name(last_name)
        email_first_normalized = self.normalize_name(email_firstname)
        email_last_normalized = self.normalize_name(email_lastname)
        
        def substantial_match(input_name, email_name):
            if len(input_name) < 3:
                return False
            if input_name in email_name:
                return True
            if email_name in input_name:
                return True
            input_words = first_name.lower().split()
            for word in input_words:
                word_normalized = self.normalize_name(word)
                if len(word_normalized) >= 3 and word_normalized in email_name:
                    return True
            return False
        
        first_matches_first = substantial_match(first_normalized, email_first_normalized)
        first_matches_last = substantial_match(first_normalized, email_last_normalized)
        last_matches_first = substantial_match(last_normalized, email_first_normalized)
        last_matches_last = substantial_match(last_normalized, email_last_normalized)
        
        if (first_matches_first and last_matches_last):
            return True
        if (first_matches_last and last_matches_first):
            return True
        if (first_matches_first or first_matches_last) and (last_matches_first or last_matches_last):
            return True
        
        return False
    
    def post(self, request):
        client_ip = self.get_client_ip(request)
        ban_key = f'registration_ban_{client_ip}'
        attempts_key = f'registration_attempts_{client_ip}'
        
        ban_data = cache.get(ban_key)
        if ban_data:
            ban_until = ban_data.get('ban_until', 0)
            current_time = time.time()
            time_remaining = int(ban_until - current_time)
            
            if time_remaining > 0:
                minutes_remaining = time_remaining // 60
                return Response({
                    "banned": True,
                    "timeRemaining": time_remaining,
                    "banUntil": ban_until,
                    "message": f"Too many inappropriate registration attempts. Please try again in {minutes_remaining} minute(s)."
                }, status=429)
            else:
                cache.delete(ban_key)
                cache.delete(attempts_key)
        
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip()
        
        slur_list = SLUR_LIST if SLUR_LIST else [
            'fuck', 'shit', 'bitch', 'ass', 'dick', 'pussy', 'cock', 'cunt',
            'kupal', 'gago', 'putang', 'bobo', 'tanga', 'tangina', 'puta',
            'sexy', 'horny', 'porn', 'sex', 'nude', 'tite', 'puke', 'kantot',
            'tarantado', 'ulol', 'siraulo', 'leche', 'yawa'
        ]
        
        name_lower = f"{first_name} {last_name}".lower()
        has_obvious_profanity = any(word in name_lower for word in slur_list)
        
        if has_obvious_profanity:
            current_attempts = cache.get(attempts_key, 0)
            current_attempts += 1
            
            if current_attempts >= 3:
                ban_duration = 300
                ban_until = time.time() + ban_duration
                
                ban_data = {
                    'banned': True,
                    'ban_until': ban_until,
                    'attempts': current_attempts
                }
                cache.set(ban_key, ban_data, ban_duration + 60)
                cache.delete(attempts_key)
                
                return Response({
                    "banned": True,
                    "timeRemaining": ban_duration,
                    "banUntil": ban_until,
                    "message": "You have been temporarily blocked from registration due to multiple inappropriate attempts. Please try again in 5 minutes."
                }, status=429)
            else:
                cache.set(attempts_key, current_attempts, 600)
                remaining_attempts = 3 - current_attempts
                
                return Response({
                    "blocked": True,
                    "remainingAttempts": remaining_attempts,
                    "message": f"The name you entered contains inappropriate content. Please use your real name. ({remaining_attempts} attempt(s) remaining before temporary ban)"
                })
        
        name_matches_email = self.check_name_match(first_name, last_name, email)
        
        if name_matches_email:
            return Response({
                "hasIssue": False,
                "message": "Your information looks good!"
            })
        
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        
        email_username = email.split('@')[0] if '@' in email else ''
        has_underscore = '_' in email_username
        email_context = ''
        if has_underscore:
            parts = email_username.split('_')
            email_context = f"\nEmail format suggests: Last name might be '{parts[0]}' and first name might be '{' '.join(parts[1:])}'"
        
        if AI_PROMPTS:
            system_prompt_text = AI_PROMPTS.get('system_prompt', '')
            user_prompt_template = AI_PROMPTS.get('user_prompt_template', '')
        else:
            system_prompt_text = """You are a name validator for a school. Block offensive names with 'block'. Warn with 'soft-warning' if names don't match email (need 3+ character match). Users often swap first/last names - if both parts exist in email, it's OK. Always respond with valid JSON."""
            user_prompt_template = """Validate this name:
First Name: {first_name}
Last Name: {last_name}
Email: {email}{email_context}

Respond with JSON: {{"hasIssue": true/false, "severity": "ok/soft-warning/block", "message": "Your message"}}"""
        
        user_prompt = user_prompt_template.format(
            first_name=first_name,
            last_name=last_name,
            email=email,
            email_context=email_context
        )
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": os.getenv('AI_MODEL'),
            "messages": [
                {"role": "system", "content": system_prompt_text},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 600,
            "temperature": 0.1
        }
        
        try:
            response = requests.post(
                f"{settings.AI_API_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                ai_response = data["choices"][0]["message"]["content"]
                
                try:
                    result = json.loads(ai_response)
                    
                    if result.get('severity') == 'block':
                        current_attempts = cache.get(attempts_key, 0)
                        current_attempts += 1
                        
                        if current_attempts >= 3:
                            ban_duration = 300
                            ban_until = time.time() + ban_duration
                            
                            ban_data = {
                                'banned': True,
                                'ban_until': ban_until,
                                'attempts': current_attempts
                            }
                            cache.set(ban_key, ban_data, ban_duration + 60)
                            cache.delete(attempts_key)
                            
                            return Response({
                                "banned": True,
                                "timeRemaining": ban_duration,
                                "banUntil": ban_until,
                                "message": "You have been temporarily blocked from registration due to multiple inappropriate attempts. Please try again in 5 minutes."
                            }, status=429)
                        else:
                            cache.set(attempts_key, current_attempts, 600)
                            remaining_attempts = 3 - current_attempts
                            return Response({
                                "blocked": True,
                                "remainingAttempts": remaining_attempts,
                                "message": result.get('message', 'The name you entered is inappropriate for registration.') + f" ({remaining_attempts} attempt(s) remaining before temporary ban)"
                            })
                    
                    elif result.get('severity') == 'soft-warning':
                        return Response({
                            "softWarning": True,
                            "message": result.get('message', 'Please verify that you entered your correct name.')
                        })
                    
                    return Response(result)
                    
                except json.JSONDecodeError:
                    json_match = re.search(r'\{[^}]+\}', ai_response)
                    if json_match:
                        result = json.loads(json_match.group())
                        
                        if result.get('severity') == 'block':
                            current_attempts = cache.get(attempts_key, 0)
                            current_attempts += 1
                            
                            if current_attempts >= 3:
                                ban_duration = 300
                                ban_until = time.time() + ban_duration
                                ban_data = {
                                    'banned': True,
                                    'ban_until': ban_until,
                                    'attempts': current_attempts
                                }
                                cache.set(ban_key, ban_data, ban_duration + 60)
                                cache.delete(attempts_key)
                                
                                return Response({
                                    "banned": True,
                                    "timeRemaining": ban_duration,
                                    "banUntil": ban_until,
                                    "message": "You have been temporarily blocked from registration due to multiple inappropriate attempts. Please try again in 5 minutes."
                                }, status=429)
                            else:
                                cache.set(attempts_key, current_attempts, 600)
                                remaining_attempts = 3 - current_attempts
                                return Response({
                                    "blocked": True,
                                    "remainingAttempts": remaining_attempts,
                                    "message": result.get('message', 'The name you entered is inappropriate for registration.') + f" ({remaining_attempts} attempt(s) remaining before temporary ban)"
                                })
                        
                        elif result.get('severity') == 'soft-warning':
                            return Response({
                                "softWarning": True,
                                "message": result.get('message', 'Please verify that you entered your correct name.')
                            })
                        
                        return Response(result)
                    else:
                        return Response({
                            "hasIssue": False,
                            "message": "Your information looks good!"
                        })
            else:
                return Response({
                    "hasIssue": False,
                    "message": "Your information looks good!"
                })
                
        except Exception as e:
            logger.error(f"Name validation error: {e}")
            return Response({
                "hasIssue": False,
                "message": "Your information looks good!"
            })
@method_decorator(csrf_exempt, name='dispatch')
class VerifyIDView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    MODELS_TO_TRY = [
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
    ]

    def _get_current_school_year(self) -> str:
        now = datetime.now()
        y   = now.year
        return f"{y}-{y+1}" if now.month >= 8 else f"{y-1}-{y}"

    def _parse_school_year_start(self, raw: str) -> int | None:
        if not raw:
            return None
        match = re.search(r'(\d{4})\s*[-–]\s*\d{4}', raw)
        if match:
            return int(match.group(1))
        match = re.search(r'\d{4}', raw)
        if match:
            return int(match.group(0))
        return None

    def _is_school_year_valid(self, extracted_year: str) -> tuple:
        current_sy    = self._get_current_school_year()
        current_start = self._parse_school_year_start(current_sy)
        id_start      = self._parse_school_year_start(extracted_year)

        if id_start is None:
            return False, f"Could not read the school year on your ID. Current school year is {current_sy}."

        if id_start < current_start:
            expired_sy = f"{id_start}-{id_start+1}"
            return False, (
                f"Your ID shows school year {expired_sy}, which has already expired. "
                f"Current school year is {current_sy}. "
                "Please use your current valid ID."
            )

        return True, current_sy

    def _normalize(self, name: str) -> set:
        if not name:
            return set()
        cleaned = re.sub(r"[^a-zA-Z\s]", " ", name).lower()
        tokens  = cleaned.split()
        stop    = {'de', 'la', 'ng', 'si', 'mga', 'at', 'jr', 'sr', 'ii', 'iii', 'iv'}
        return {t for t in tokens if len(t) > 1 and t not in stop}

    def _names_match(self, name_a: str, name_b: str) -> bool:
        tokens_a = self._normalize(name_a)
        tokens_b = self._normalize(name_b)
        if not tokens_a or not tokens_b:
            return False
        matches = sum(
            1 for ta in tokens_a
            if any(ta in tb or tb in ta for tb in tokens_b)
        )
        return matches >= 2

    def _name_matches_form(self, id_name: str, first_name: str, last_name: str) -> bool:
        if not id_name:
            return False
        id_tokens    = self._normalize(id_name)
        first_tokens = self._normalize(first_name)
        last_tokens  = self._normalize(last_name)

        def found(form_tokens):
            return any(
                any(ft in it or it in ft for it in id_tokens)
                for ft in form_tokens
            )
        return found(first_tokens) and found(last_tokens)

    def _get_pixel_similarity(self, img1: Image.Image, img2: Image.Image) -> float:
        size = (64, 64)
        a = list(img1.resize(size).convert('L').getdata())
        b = list(img2.resize(size).convert('L').getdata())
        diff = sum(abs(x - y) for x, y in zip(a, b))
        return 1.0 - (diff / (len(a) * 255))

    def _decode_and_stamp(self, data_url: str, label: str, max_width: int = 800) -> tuple:
        from PIL import ImageDraw
        _, b64 = data_url.split(',', 1)
        img    = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')
        if img.width > max_width:
            ratio = max_width / img.width
            img   = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)
        stamped = img.copy()
        draw    = ImageDraw.Draw(stamped)
        bw = max(100, stamped.width // 5)
        bh = max(32,  stamped.height // 16)
        draw.rectangle([0, 0, bw, bh], fill=(220, 38, 38))
        draw.text((8, 8), label, fill=(255, 255, 255))
        buf = io.BytesIO()
        stamped.save(buf, format='JPEG', quality=82)
        return img, base64.b64encode(buf.getvalue()).decode('utf-8')

    def _img_to_b64(self, img: Image.Image) -> str:
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=82)
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    def _call_groq(self, headers: dict, model: str, system: str,
                   user_text: str, images_b64: list, max_tokens: int = 500) -> dict | None:
        content = [{"type": "text", "text": user_text}]
        for b64 in images_b64:
            content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": content},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
        }

        try:
            resp = requests.post(
                f"{settings.AI_API_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30,
            )
            if resp.status_code == 200:
                return json.loads(resp.json()["choices"][0]["message"]["content"])
            if resp.status_code == 429:
                return None
            logger.warning(f"Groq {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Groq call error: {e}")
        return None

    def _extract_name_from_image(self, headers: dict, model: str,
                                  img_b64: str, side_label: str) -> str:
        system = (
            "You are reading text from a student ID card. "
            "Extract only the student full name. Respond with JSON only."
        )
        user = (
            f"This is the {side_label} of an SPCC student ID card.\n"
            "Find the student full name printed on this card.\n"
            "Return ONLY: {\"name\": \"FULL NAME\"} or {\"name\": null} if unreadable."
        )
        result = self._call_groq(headers, model, system, user, [img_b64], max_tokens=100)
        if result:
            return (result.get("name") or "").strip()
        return ""

    def post(self, request):
        front_data = request.data.get('id_front_image')
        back_data  = request.data.get('id_back_image')
        first_name = request.data.get('first_name', '').strip()
        last_name  = request.data.get('last_name',  '').strip()

        if not front_data:
            return Response({"is_valid_id": False, "message": "Front image is required."}, status=400)
        if not back_data:
            return Response({"is_valid_id": False, "message": "Back image is required."}, status=400)

        try:
            front_img, front_b64 = self._decode_and_stamp(front_data, 'FRONT')
            back_img,  back_b64  = self._decode_and_stamp(back_data,  'BACK')
        except Exception as e:
            logger.error(f"Image decode error: {e}")
            return Response({"is_valid_id": False, "message": "Failed to read images. Please try again."}, status=400)

        if self._get_pixel_similarity(front_img, back_img) >= 0.92:
            return Response({
                "is_valid_id": False,
                "same_side_detected": True,
                "message": "Both images appear to be the same side. Please upload FRONT and BACK separately."
            }, status=400)

        current_sy = self._get_current_school_year()

        api_key = getattr(settings, 'GROQ_API_KEY', None)
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        system_prompt = (
            "You are an ID verification assistant for Systems Plus Computer College (SPCC). "
            "Each image has a red FRONT or BACK label in the top-left corner. "
            "Both sides of an SPCC ID print the student name — read each side independently. "
            "The school year is critical — extract it exactly as printed. "
            "Return valid JSON only."
        )

        user_prompt = f"""Two sides of an SPCC student ID are shown.
Red label in the top-left of each image tells you which side it is.

Student registered as:
  First name : {first_name}
  Last name  : {last_name}
Current school year: {current_sy}

Extract the student name from EACH side independently.
Extract the school year exactly as printed on the ID (e.g. 2024-2025, 2025-2026).

Return ONLY this JSON:
{{
    "is_valid_id": true or false,
    "front_extracted_name": "name exactly as printed on FRONT, or null if truly unreadable",
    "back_extracted_name": "name exactly as printed on BACK, or null if truly unreadable",
    "extracted_id_number": "student ID number or null",
    "extracted_year": "school year exactly as printed e.g. 2024-2025, or null",
    "extracted_strand": "strand e.g. ICT, ABM, STEM or null",
    "front_has_spcc_logo": true or false,
    "front_has_photo": true or false,
    "back_has_official_markings": true or false,
    "confidence": "high" or "medium" or "low",
    "image_quality": "good" or "fair" or "poor",
    "issues": [],
    "message": "one sentence summary"
}}

is_valid_id rules:
- TRUE if FRONT shows SPCC name/logo AND a student photo.
- FALSE only if clearly not SPCC or completely unreadable.
- Glare, blur, missing barcode = still TRUE if logo and photo are visible.
- Do NOT factor in school year for is_valid_id — just extract it accurately."""

        for model_name in self.MODELS_TO_TRY:
            result = self._call_groq(
                headers, model_name, system_prompt, user_prompt,
                [front_b64, back_b64]
            )

            if result is None:
                time.sleep(1)
                continue

            front_name = (result.get('front_extracted_name') or '').strip()
            back_name  = (result.get('back_extracted_name')  or '').strip()
            extracted_year = (result.get('extracted_year') or '').strip()

            logger.info(f"front_name='{front_name}' back_name='{back_name}' year='{extracted_year}'")

            if not front_name:
                front_name = self._extract_name_from_image(headers, model_name, self._img_to_b64(front_img), 'FRONT')
                logger.info(f"Recovered front name: '{front_name}'")

            if not back_name:
                back_name = self._extract_name_from_image(headers, model_name, self._img_to_b64(back_img), 'BACK')
                logger.info(f"Recovered back name: '{back_name}'")

            if not front_name and not back_name:
                return Response({
                    "is_valid_id": False,
                    "message": "Could not read the name on either side of the ID. Please upload clearer photos."
                }, status=400)

            if front_name and back_name:
                sides_match = self._names_match(front_name, back_name)
                logger.info(f"Cross-check '{front_name}' vs '{back_name}' → {sides_match}")
                if not sides_match:
                    return Response({
                        "is_valid_id": False,
                        "different_ids_detected": True,
                        "message": (
                            f"The front and back appear to be from different ID cards "
                            f"(front: '{front_name}', back: '{back_name}'). "
                            "Please upload both sides of your own single ID card."
                        )
                    }, status=400)

            year_valid, year_msg = self._is_school_year_valid(extracted_year)
            if not year_valid:
                logger.warning(f"School year check failed: '{extracted_year}' — {year_msg}")
                return Response({
                    "is_valid_id": False,
                    "expired_id_detected": True,
                    "extracted_year": extracted_year,
                    "current_school_year": current_sy,
                    "message": year_msg
                }, status=400)

            primary_name = front_name or back_name
            result['extracted_name'] = primary_name
            result['matches_input']  = self._name_matches_form(primary_name, first_name, last_name)

            if (
                not result.get('is_valid_id')
                and result.get('front_has_spcc_logo')
                and result.get('front_has_photo')
                and result.get('image_quality') != 'poor'
            ):
                result['is_valid_id'] = True

            if result.get('is_valid_id') and result.get('matches_input'):
                strand = result.get('extracted_strand', '') or ''
                extra  = ', '.join(filter(None, [current_sy, strand]))
                result['message'] = f"ID verified successfully — {extra}"
            elif result.get('is_valid_id') and not result.get('matches_input'):
                result['message'] = (
                    f"The name on your ID ({primary_name or 'not found'}) "
                    f"doesn't match the name you entered ({first_name} {last_name}). "
                    "Please use your name exactly as it appears on your ID."
                )

            logger.info(f"Done — valid={result.get('is_valid_id')} match={result.get('matches_input')} year='{extracted_year}'")
            return Response(result)

        return Response({
            "is_valid_id": False,
            "message": "ID verification is temporarily unavailable. Please try again shortly."
        }, status=500)