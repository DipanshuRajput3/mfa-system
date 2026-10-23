from typing import Optional

from database import db
from models import LoginAttempt, SecurityLog, to_document

async def record_login_attempt(username: str, ip_address: str, device_info: str, country: Optional[str],
                               risk_score: int, success: bool, mfa_required: bool):
    """Persist a login attempt"""
    attempt = LoginAttempt(
        username=username,
        ip_address=ip_address,
        device_info=device_info,
        country=country,
        risk_score=risk_score,
        success=success,
        mfa_required=mfa_required
    )
    await db.login_attempts.insert_one(to_document(attempt))

async def log_security_event(username: str, action: str, ip_address: str, device_info: str,
                             risk_score: int, details: Optional[str] = None):
    """Log security event to database"""
    log = SecurityLog(
        username=username,
        action=action,
        ip_address=ip_address,
        device_info=device_info,
        risk_score=risk_score,
        details=details
    )
    await db.security_logs.insert_one(to_document(log))
