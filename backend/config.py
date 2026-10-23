import os
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# Allowed CORS origins (comma separated)
CORS_ORIGINS = [o.strip() for o in (os.environ.get('CORS_ORIGINS') or 'http://localhost:3000').split(',') if o.strip()]

# Brevo transactional email API (HTTPS, so it works on hosts that block SMTP ports, e.g. Render free plan)
BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
MAIL_FROM = os.environ.get('MAIL_FROM')
MAIL_FROM_NAME = os.environ.get('MAIL_FROM_NAME') or 'MFA System'

# Risk / MFA settings
RISK_THRESHOLD = 50
OTP_TTL_MINUTES = 5
OTP_MAX_ATTEMPTS = 5
SESSION_TTL_HOURS = 24
LOCAL_TZ = ZoneInfo('Asia/Kolkata')
