VERIFICATION_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #000000 0%, #03045E 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                Welcome to SPCC-ORS
                            </h1>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                                Verify Your Email Address
                            </h2>
                            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Thank you for registering with SPCC Online Reservation System. To complete your registration and start using your account, please verify your email address.
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, rgb(232, 180, 50) 0%, goldenrod 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(232, 180, 50, 0.3); transition: transform 0.2s;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                This verification link will expire in <strong style="color: #1a1a1a;">24 hours</strong>.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background-color: #f9fafb; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                                <strong style="color: #1a1a1a;">Didn't create an account?</strong><br>
                                If you didn't request this email, you can safely ignore it.
                            </p>
                            <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
                                © 2026 SPCC Online Reservation System. All rights reserved.
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

PASSWORD_RESET_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #000000 0%, #03045E 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                Password Reset Request
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                                Reset Your Password
                            </h2>
                            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                We received a request to reset your password for your SPCC Online Reservation System account. Click the button below to create a new password.
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{reset_link}" style="display: inline-block; background: linear-gradient(135deg, rgb(232, 180, 50) 0%, goldenrod 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(232, 180, 50, 0.3); transition: transform 0.2s;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security notice -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                    <strong>Security Notice:</strong> This link will expire in <strong>24 hours</strong>. For your security, never share this link with anyone.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                                <strong style="color: #1a1a1a;">Didn't request this?</strong><br>
                                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                            <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
                                © 2026 SPCC Online Reservation System. All rights reserved.
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

RESEND_VERIFICATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                    
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #000000 0%, #03045E 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                Email Verification
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                                Verify Your Email Address
                            </h2>
                            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                You requested a new verification link for your SPCC Online Reservation System account. Click the button below to verify your email address.
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, rgb(232, 180, 50) 0%, goldenrod 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(232, 180, 50, 0.3); transition: transform 0.2s;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                This verification link will expire in <strong style="color: #1a1a1a;">24 hours</strong>.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                                <strong style="color: #1a1a1a;">Need help?</strong><br>
                                If you're having trouble verifying your email, please contact our support team.
                            </p>
                            <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
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

RESERVATION_CONFIRMATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservation Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 650px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <tr>
                        <td style="background-color: black; padding: 48px 40px; text-align: center;">
                            <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                                Order Confirmed!
                            </h1>
                            <p style="margin: 0 ; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 400;">
                                Your reservation has been successfully placed
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0; text-align: center; transform: translateY(-25px);">
                            <div style="margin-top: 10px; display: inline-block; background-color: black; padding: 16px 36px; border-radius: 50px; box-shadow: 0 8px 20px rgba(232, 180, 50, 0.4);">
                                <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">
                                    ORDER ID: <span style="font-size: 18px; font-weight: 800; margin-top: 10px;">#{reservation_id}</span>
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 40px 40px; margin-top: 10px;">
                            <div style="text-align: center; margin-bottom: 32px;">
                                <h2 style="margin: 0 0 8px; color: #111827; font-size: 24px; font-weight: 700;">
                                    Thank you, {customer_name}!
                                </h2>
                                <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                                    We've received your order and it's being processed
                                </p>
                            </div>
                            
                            <div style="background-color: white; border-radius: 16px; padding: 24px; margin-bottom: 32px; border: none;">
                                <h3 style="margin: 0 0 16px; color: black; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                                     Customer Information
                                </h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: black; font-size: 14px; font-weight: 600;">Name:</td>
                                        <td style="padding: 8px 0; color: black; font-weight: 700; font-size: 15px; text-align: right;">{customer_full_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: black; font-size: 14px; font-weight: 600;">Email:</td>
                                        <td style="padding: 8px 0; color: black; font-weight: 700; font-size: 15px; text-align: right;">{customer_email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: black; font-size: 14px; font-weight: 600;">Order Date:</td>
                                        <td style="padding: 8px 0; color: black; font-weight: 700; font-size: 15px; text-align: right;">{reservation_date}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div style="background-color: #f9fafb; border-radius: 16px; padding: 28px; margin-bottom: 32px; border: 2px solid #e5e7eb;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                    <h3 style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">
                                         Order Summary
                                    </h3>
                                    <span style="background: none; color: #78350f; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 5px;">
                                        {status}
                                    </span>
                                </div>
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                                    <tr style="border-bottom: 2px solid #e5e7eb;">
                                        <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Total Items</td>
                                        <td style="padding: 12px 0; color: #111827; font-weight: 700; font-size: 16px; text-align: right;">{total_items}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 16px 0; color: #111827; font-size: 17px; font-weight: 700;">Total Amount</td>
                                        <td style="padding: 16px 0; color: black; font-weight: 800; font-size: 28px; text-align: right;">₱{total_amount}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 700;">
                                 Order Items
                            </h3>
                            <div style="border: 2px solid #e5e7eb; border-radius: 16px; overflow: hidden; margin-bottom: 28px;">
                                {items_html}
                            </div>
                            
                            {notes_section}
                            
                            <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 24px; border-radius: 12px; margin-top: 32px;">
                                <h4 style="margin: 0 0 12px; color: black; font-size: 16px; font-weight: 700;">
                                     Important Reminders
                                </h4>
                                <ul style="margin: 0; padding-left: 20px; color: #black; font-size: 14px; line-height: 1.8;">
                                    <li style="margin-bottom: 8px;"><strong>Save your Order ID: #{reservation_id}</strong> for tracking and pickup</li>
                                    <li style="margin-bottom: 8px;">Please bring a valid Order ID during pickup</li>
                                    <li>For any questions, reference your Order ID in all communications</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); padding: 36px 40px; border-top: 3px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 12px; color: #111827; font-size: 15px; font-weight: 700;">
                                SPCC Online Reservation System
                            </p>
                            <p style="margin: 0 0 16px; color: #6b7280; font-size: 13px; line-height: 1.6;">
                                Systems Plus Computer College - Caloocan Campus<br>
                                For questions or concerns, please contact our support team
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2026 SPCC ORS. All rights reserved.
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