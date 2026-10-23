from datetime import datetime, timedelta, timezone
from typing import Optional

from config import LOCAL_TZ
from database import db

async def compute_risk_score(username: str, ip_address: str, device_info: str, country: Optional[str]) -> int:
    """
    Compute risk score based on:
    - IP address history
    - Device fingerprint history
    - Failed login attempts
    - Time of access (Asia/Kolkata)
    - Country change since last successful login

    Risk Score Ranges:
    0-30: Low
    31-60: Medium
    61-100: High
    """
    risk_score = 0

    # Check failed login attempts in last 24 hours
    yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    failed_attempts = await db.login_attempts.count_documents({
        'username': username,
        'success': False,
        'timestamp': {'$gte': yesterday.isoformat()}
    })
    risk_score += min(failed_attempts * 15, 40)  # Max 40 points for failed attempts

    # Check if IP is known
    known_ip = await db.login_attempts.find_one({
        'username': username,
        'ip_address': ip_address,
        'success': True
    })
    if not known_ip:
        risk_score += 25  # Unknown IP

    # Check if device is known
    known_device = await db.login_attempts.find_one({
        'username': username,
        'device_info': device_info,
        'success': True
    })
    if not known_device:
        risk_score += 20  # Unknown device

    # Check time of access (unusual hours increase risk)
    current_hour = datetime.now(LOCAL_TZ).hour
    if current_hour < 6 or current_hour > 22:  # Late night/early morning
        risk_score += 15

    # Check if country differs from the last successful login
    if country:
        last_success = await db.login_attempts.find_one(
            {'username': username, 'success': True},
            sort=[('timestamp', -1)]
        )
        last_country = last_success.get('country') if last_success else None
        if last_country and last_country != country:
            risk_score += 15

    return min(risk_score, 100)  # Cap at 100
