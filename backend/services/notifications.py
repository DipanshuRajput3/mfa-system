"""OTP email delivery via Brevo's transactional email API"""
import httpx

from config import BREVO_API_KEY, MAIL_FROM, MAIL_FROM_NAME, OTP_TTL_MINUTES

BREVO_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email'

class EmailDeliveryError(Exception):
    """Raised when the OTP email could not be sent"""

def mask_email(email: str) -> str:
    """Mask email for display, e.g. jo***@gmail.com"""
    local, _, domain = email.partition('@')
    return f"{local[:2]}***@{domain}"

async def send_otp_email(to_email: str, otp: str):
    """Send OTP to the user's registered email"""
    if not BREVO_API_KEY or not MAIL_FROM:
        raise EmailDeliveryError("BREVO_API_KEY / MAIL_FROM not configured")

    payload = {
        'sender': {'name': MAIL_FROM_NAME, 'email': MAIL_FROM},
        'to': [{'email': to_email}],
        'subject': 'Your login OTP',
        'textContent': f"Your OTP is {otp}, valid {OTP_TTL_MINUTES} minutes.",
        'htmlContent': f"""\
<html>
  <body style="font-family: Arial, sans-serif; color: #111827;">
    <p>Your OTP is <strong style="font-size: 20px; letter-spacing: 2px;">{otp}</strong>, valid {OTP_TTL_MINUTES} minutes.</p>
    <p style="color: #6B7280; font-size: 12px;">If you did not try to sign in, please change your password.</p>
  </body>
</html>
""",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.post(
                BREVO_EMAIL_URL,
                json=payload,
                headers={'api-key': BREVO_API_KEY, 'accept': 'application/json'},
            )
    except httpx.HTTPError as e:
        raise EmailDeliveryError(f"Brevo request failed: {e}") from e

    if response.is_error:
        raise EmailDeliveryError(f"Brevo API error {response.status_code}: {response.text}")
