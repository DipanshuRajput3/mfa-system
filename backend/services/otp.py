"""OTP issuing and verification for the MFA step"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from pymongo import ReturnDocument

from config import OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES
from database import db
from models import OTPRecord, to_document
from services.notifications import send_otp_email

TOO_MANY_ATTEMPTS = "Too many incorrect attempts. Please login again."
NO_LONGER_VALID = "OTP is no longer valid. Please login again."

class OTPError(Exception):
    """OTP verification failure with the HTTP response and audit details"""
    def __init__(self, status_code: int, detail: str, reason: str, risk_score: int = 0):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.reason = reason
        self.risk_score = risk_score

def generate_otp() -> str:
    """Generate cryptographically secure 6-digit OTP"""
    return f"{secrets.randbelow(10**6):06d}"

async def issue_otp(username: str, email: str, risk_score: int, country: Optional[str]):
    """Email a fresh OTP to the user and store it; older unused OTPs are invalidated"""
    otp = generate_otp()
    await send_otp_email(email, otp)

    await db.otp_records.update_many(
        {'username': username, 'is_used': False},
        {'$set': {'is_used': True}}
    )
    otp_record = OTPRecord(
        username=username,
        otp=otp,
        risk_score=risk_score,
        country=country,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)
    )
    await db.otp_records.insert_one(to_document(otp_record))

async def consume_otp(username: str, code: str) -> dict:
    """
    Check the code against the user's latest OTP and mark it used.
    Raises OTPError if the OTP is missing, used, expired, wrong or locked after too many attempts.
    """
    otp_record = await db.otp_records.find_one({'username': username}, sort=[('created_at', -1)])
    if not otp_record:
        raise OTPError(401, "Invalid OTP", "No OTP issued")

    risk_score = otp_record.get('risk_score', 0)

    if otp_record.get('failed_attempts', 0) >= OTP_MAX_ATTEMPTS:
        raise OTPError(429, TOO_MANY_ATTEMPTS, "OTP attempt limit reached", risk_score)

    if otp_record['is_used']:
        raise OTPError(401, NO_LONGER_VALID, "Used or invalidated OTP", risk_score)

    if datetime.fromisoformat(otp_record['expires_at']) < datetime.now(timezone.utc):
        raise OTPError(401, "OTP expired", "Expired OTP", risk_score)

    if not secrets.compare_digest(otp_record['otp'].encode(), code.encode()):
        updated = await db.otp_records.find_one_and_update(
            {'id': otp_record['id']},
            {'$inc': {'failed_attempts': 1}},
            return_document=ReturnDocument.AFTER
        )
        if updated['failed_attempts'] >= OTP_MAX_ATTEMPTS:
            await db.otp_records.update_one({'id': otp_record['id']}, {'$set': {'is_used': True}})
            raise OTPError(429, TOO_MANY_ATTEMPTS, "Invalid OTP, attempt limit reached", risk_score)
        raise OTPError(401, "Invalid OTP", f"Invalid OTP ({updated['failed_attempts']}/{OTP_MAX_ATTEMPTS})", risk_score)

    # Guarded update so the same OTP cannot be redeemed twice
    result = await db.otp_records.update_one(
        {'id': otp_record['id'], 'is_used': False},
        {'$set': {'is_used': True}}
    )
    if result.modified_count == 0:
        raise OTPError(401, NO_LONGER_VALID, "Used or invalidated OTP", risk_score)

    return otp_record
