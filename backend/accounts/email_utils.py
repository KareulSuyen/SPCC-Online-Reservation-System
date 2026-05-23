import requests
import os
from django.conf import settings
import traceback
import time
import logging
import pytz
from datetime import datetime

logger = logging.getLogger(__name__)

PHILIPPINE_TZ = pytz.timezone('Asia/Manila')

def send_email_via_brevo_api(to_email, subject, html_content=None, text_content=None):
    api_key = os.getenv('BREVO_API_KEY')
    if not api_key:
        error_msg = "brevo api key environment variable isnt set!"
        logger.error(error_msg)
        return False, error_msg
    
    if isinstance(to_email, str):
        to_email = [to_email]
    
    if not html_content and text_content:
        html_content = f"<html><body><pre>{text_content}</pre></body></html>"
    elif not html_content and not text_content:
        return False, "No email content"
    
    url = os.getenv('EMAIL_URL')
    
    headers = {
        "Accept": "application/json",
        "api-key": api_key,
        "Content-Type": "application/json",
    }
    
    recipients = [{"email": email} for email in to_email]
    
    data = {
        "sender": {
            "name": "SPCC Online Reservation System",
            "email": settings.DEFAULT_FROM_EMAIL or "noreply@spccors.com"
        },
        "to": recipients,
        "subject": subject,
        "htmlContent": html_content,
    }
    
    if text_content:
        data["textContent"] = text_content
    
    try:
        logger.info(f"Sending email to {to_email} via Brevo API")
        response = requests.post(url, headers=headers, json=data, timeout=20)        
        if response.status_code in [200, 201]:
            response_data = response.json()
            logger.info(f"Email sent successfully: {response_data}")
            return True, "Email sent successfully"
        else:
            error_msg = f"Brevo API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            
            try:
                error_data = response.json()
                if 'message' in error_data:
                    logger.error(f"Error message: {error_data['message']}")
                if 'code' in error_data:
                    logger.error(f"Error code: {error_data['code']}")
            except:
                pass
            
            return False, error_msg
            
    except requests.exceptions.Timeout:
        error_msg = "Request timeout"
        logger.error(error_msg)
        return False, error_msg
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Request error: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return False, error_msg


def send_email_sync(to_email, subject, html_content=None, text_content=None):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            success, message = send_email_via_brevo_api(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            if success:
                return True, message
            else:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt)
                    logger.info(f"Retry attempt {attempt + 1} in {wait_time}s")
                    time.sleep(wait_time)
                    
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt)
                time.sleep(wait_time)
    
    return False, "Failed after all retry attempts"

def send_email_async(to_email, subject, html_content=None, text_content=None):
    return send_email_sync(to_email, subject, html_content, text_content)

def get_email_base_template(content, preheader=""):
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <!--[if mso]>
        <noscript>
            <xml>
                <o:OfficeDocumentSettings>
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
        </noscript>
        <![endif]-->
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background-color: #f3f4f6;
            }}
            
            .preheader {{
                display: none !important;
                visibility: hidden;
                mso-hide: all;
                font-size: 1px;
                line-height: 1px;
                max-height: 0;
                max-width: 0;
                opacity: 0;
                overflow: hidden;
            }}
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
        <span class="preheader">{preheader}</span>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                        
                        <!-- Header with gradient -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 40px 30px 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                    SPCC ORS
                                </h1>
                                <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">
                                    Online Reservation System
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 48px 40px;">
                                {content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="text-align: center;">
                                            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                                                <strong>St. Paul College of Cavite</strong><br>
                                                Online Reservation System
                                            </p>
                                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                                This is an automated message, please do not reply to this email.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                    </table>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 24px;">
                        <tr>
                            <td style="text-align: center; padding: 0 20px;">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                                    © 2024 SPCC Online Reservation System. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def send_verification_email(user, verification_link):
    content = f"""
    <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 16px; margin-bottom: 24px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="#3b82f6"/>
            </svg>
        </div>
        <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
            Welcome to SPCC ORS!
        </h2>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
            Hi {user.first_name}, we're excited to have you on board.
        </p>
    </div>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px 24px; margin: 32px 0; border-radius: 8px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> Please verify your email address to activate your account and start making reservations.
        </p>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
        <a href="{verification_link}" 
           style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                  color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 12px; 
                  font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                  transition: transform 0.2s;">
            Verify Email Address
        </a>
    </div>
    
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 20px; margin-top: 32px;">
        <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
            <strong>Security Notice:</strong> This verification link will expire in <strong>24 hours</strong> for your security.
        </p>
    </div>
    
    <p style="margin: 32px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
        If you didn't create this account, you can safely ignore this email.
    </p>
    """
    
    html_content = get_email_base_template(
        content=content,
        preheader="Verify your email to get started."
    )
    
    text_content = f"""
    Welcome to SPCC Online Reservation System!
    
    Hi {user.first_name},
    
    Please verify your email address to activate your account.
    
    Click here to verify: {verification_link}
    
    This link will expire in 24 hours.
    
    If you didn't create this account, please ignore this email.
    
    ---
    SPCC Online Reservation System
    """
    
    return send_email_via_brevo_api(
        to_email=user.email,
        subject="Verify your SPCC email address",
        html_content=html_content,
        text_content=text_content
    )


def send_password_reset_email(user, reset_link):
    content = f"""
    <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 16px; margin-bottom: 24px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z" fill="#f59e0b"/>
            </svg>
        </div>
        <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
            Reset Your Password
        </h2>
        <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
            Hi {user.first_name}, we received a request to reset your password.
        </p>
    </div>
    
    <div style="background-color: #f9fafb; border-left: 4px solid #f59e0b; padding: 20px 24px; margin: 32px 0; border-radius: 8px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
            Click the button below to create a new password. If you didn't request this, you can safely ignore this email.
        </p>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
        <a href="{reset_link}" 
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                  color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 12px; 
                  font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
                  transition: transform 0.2s;">
            Reset Password
        </a>
    </div>
    
    <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px 20px; margin-top: 32px;">
        <p style="margin: 0; color: #991b1b; font-size: 13px; line-height: 1.5;">
            <strong>Important:</strong> This reset link will expire in <strong>24 hours</strong>. For security reasons, please do not share this link with anyone.
        </p>
    </div>
    
    <p style="margin: 32px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
        If you didn't request a password reset, please contact support immediately.
    </p>
    """
    
    html_content = get_email_base_template(
        content=content,
        preheader="Reset your SPCC ORS password securely"
    )
    
    text_content = f"""
    Password Reset Request
    
    Hi {user.first_name},
    
    We received a request to reset your password for SPCC Online Reservation System.
    
    Click here to reset: {reset_link}
    
    This link will expire in 24 hours.
    
    If you didn't request this, please ignore this email and your password will remain unchanged.
    
    ---
    SPCC Online Reservation System
    """
    
    return send_email_via_brevo_api(
        to_email=user.email,
        subject="Reset your SPCC password",
        html_content=html_content,
        text_content=text_content
    )

def send_reservation_confirmation_email(reservation):
    try:
        from .email_templates import RESERVATION_CONFIRMATION_TEMPLATE
        
        user = reservation.user
        
        logger.info("="*60)
        logger.info("SENDING RESERVATION CONFIRMATION EMAIL")
        logger.info(f"Reservation ID: {reservation.id}")
        logger.info(f"User: {user.email}")
        logger.info(f"Items count: {reservation.items.count()}")
        logger.info("="*60)
        
        items_html = ""
        for item in reservation.items.all():
            try:
                if item.item:
                    item_name = item.item.name
                else:
                    item_name = "Unknown Item"
                    logger.warning(f"ReservationItem {item.id} has no associated item")
            except Exception as e:
                item_name = "Unknown Item"
                logger.error(f"Error getting item name for ReservationItem {item.id}: {str(e)}")
            
            size_display = ""
            if item.item_size:
                try:
                    size_display = f" ({item.item_size.size})"
                except Exception as e:
                    logger.error(f"Error getting size for ReservationItem {item.id}: {str(e)}")
            
            subtotal = float(item.price_at_time) * item.quantity
            
            logger.info(f"  - {item_name}{size_display}: {item.quantity} x ₱{float(item.price_at_time):.2f} = ₱{subtotal:.2f}")
            
            items_html += f"""
            <div style="padding: 20px; border-bottom: 2px solid #f3f4f6; background-color: #ffffff;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 65%;">
                            <strong style="color: #111827; font-size: 16px; font-weight: 700;">{item_name}</strong>
                            {f'<div style="margin-top: 4px;"><span style="background-color: #e0f2fe; color: #075985; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">{item.item_size.get_size_display()}</span></div>' if item.item_size else ''}
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">Quantity</div>
                            <div style="background-color: #f3f4f6; color: #111827; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">×{item.quantity}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 12px;">
                            <span style="color: #9ca3af; font-size: 13px; font-weight: 600;">Unit Price:</span>
                            <span style="color: black; font-size: 14px; font-weight: 700; margin-left: 6px;">₱{float(item.price_at_time):.2f}</span>
                        </td>
                        <td style="text-align: right; padding-top: 12px;">
                            <div style="color: #9ca3af; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Subtotal</div>
                            <strong style="color: black; font-size: 18px; font-weight: 800;">₱{subtotal:.2f}</strong>
                        </td>
                    </tr>
                </table>
            </div>
            """
        
        notes_section = ""
        if reservation.notes:
            notes_section = f"""
            <div style="margin: 28px 0;">
                <h3 style="margin: 0 0 14px; color: #111827; font-size: 17px; font-weight: 700;">
                     Special Instructions
                </h3>
                <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #fde68a; border-radius: 12px; padding: 20px;">
                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.7; font-weight: 500;">
                        {reservation.notes}
                    </p>
                </div>
            </div>
            """
        
        reservation_date_ph = reservation.created_at.astimezone(PHILIPPINE_TZ)
        reservation_date = reservation_date_ph.strftime('%B %d, %Y at %I:%M %p')
        
        customer_full_name = f"{user.first_name} {user.last_name}"
        customer_email = user.email
        
        total_items = sum(item.quantity for item in reservation.items.all())
        
        logger.info(f"Total items: {total_items}")
        logger.info(f"Total amount: ₱{float(reservation.total_amount):.2f}")
        logger.info(f"Reservation date (PH Time): {reservation_date}")
        
        html_content = RESERVATION_CONFIRMATION_TEMPLATE.format(
            customer_name=user.first_name,
            customer_full_name=customer_full_name,
            customer_email=customer_email,
            reservation_id=reservation.id,
            reservation_date=reservation_date,
            status=reservation.status.upper(),
            total_items=total_items,
            total_amount=f"{float(reservation.total_amount):.2f}",
            items_html=items_html,
            notes_section=notes_section
        )
        
        text_content = f"""

ORDER CONFIRMATION - SPCC ORS
========================================

Thank you for your order, {user.first_name}!

YOUR ORDER CREDENTIALS:
----------------------------------------
Order ID: #{reservation.id}
Customer Name: {customer_full_name}
Email: {customer_email}

ORDER DETAILS:
----------------------------------------
Order Date: {reservation_date}
Status: {reservation.status.upper()}
Total Items: {total_items}
Total Amount: ₱{float(reservation.total_amount):.2f}

ORDER ITEMS:
----------------------------------------
"""
        
        for item in reservation.items.all():
            try:
                item_name = item.item.name if item.item else "Unknown Item"
                size_display = f" ({item.item_size.get_size_display()})" if item.item_size else ""
                subtotal = float(item.price_at_time) * item.quantity
                text_content += f"\n• {item_name}{size_display}\n  Qty: {item.quantity} × ₱{float(item.price_at_time):.2f} = ₱{subtotal:.2f}\n"
            except Exception as e:
                logger.error(f"Error formatting item for text email: {str(e)}")
                text_content += f"\n• Item #{item.id}\n  Qty: {item.quantity} × ₱{float(item.price_at_time):.2f}\n"
        
        if reservation.notes:
            text_content += f"\nSPECIAL INSTRUCTIONS:\n{reservation.notes}\n"
        
        text_content += f"""
IMPORTANT REMINDERS:
----------------------------------------
• Save your Order ID: #{reservation.id}
• You'll receive email updates on status changes
• Bring a valid ID and Order ID during pickup
• Reference Order ID for all inquiries

========================================
SPCC Online Reservation System
Systems Plus Computer College
© 2026 All rights reserved.
========================================
        """        
        success, message = send_email_via_brevo_api(
            to_email=user.email,
            subject=f"Order Confirmation - #{reservation.id} | SPCC ORS",
            html_content=html_content,
            text_content=text_content
        )
        
        if success:
            logger.info(f"✓ Email sent successfully to {user.email}")
            logger.info("="*60)
            return True, "Email sent successfully"
        else:
            logger.error(f"✗ Failed to send email: {message}")
            logger.error("="*60)
            return False, message
            
    except Exception as e:
        logger.error("="*60)
        logger.error("ERROR IN send_reservation_confirmation_email")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        logger.error("="*60)
        return False, f"Error: {str(e)}"