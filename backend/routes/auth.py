import logging

from fastapi import APIRouter, HTTPException, Request

from config import RISK_THRESHOLD
from database import db
from models import OTPVerify, User, UserLogin, UserRegister, to_document
from services.audit import log_security_event, record_login_attempt
from services.context import get_client_ip, get_country, get_device_fingerprint
from services.notifications import EmailDeliveryError, mask_email
from services.otp import OTPError, consume_otp, issue_otp
from services.passwords import hash_password, verify_password
from services.risk import compute_risk_score
from services.sessions import create_session, get_active_session

router = APIRouter(prefix="/auth")
logger = logging.getLogger(__name__)

def public_user(user: dict) -> dict:
    return {
        "username": user['username'],
        "email": user['email'],
        "full_name": user['full_name']
    }

@router.post("/register")
async def register_user(user_data: UserRegister, request: Request):
    """
    Register a new user
    """
    try:
        # Check if username already exists
        if await db.users.find_one({'username': user_data.username}):
            raise HTTPException(status_code=400, detail="Username already exists")

        # Check if email already exists
        if await db.users.find_one({'email': user_data.email}):
            raise HTTPException(status_code=400, detail="Email already exists")

        user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            full_name=user_data.full_name
        )
        await db.users.insert_one(to_document(user))

        await log_security_event(
            username=user_data.username,
            action="USER_REGISTERED",
            ip_address=get_client_ip(request),
            device_info=get_device_fingerprint(request),
            risk_score=0,
            details="New user registration"
        )

        return {
            "success": True,
            "message": "User registered successfully",
            "username": user_data.username
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/login")
async def login_user(login_data: UserLogin, request: Request):
    """
    Login user with risk-based MFA
    Algorithm implementation from research paper
    """
    try:
        ip_address = get_client_ip(request)
        device_info = get_device_fingerprint(request)
        country = await get_country(ip_address)

        # Step 1: Validate Password
        user = await db.users.find_one({'username': login_data.username})
        if not user or not verify_password(login_data.password, user['password_hash']):
            await record_login_attempt(
                login_data.username, ip_address, device_info, country,
                risk_score=0, success=False, mfa_required=False
            )
            await log_security_event(
                username=login_data.username,
                action="LOGIN_FAILED",
                ip_address=ip_address,
                device_info=device_info,
                risk_score=0,
                details="Invalid credentials"
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Step 2: Compute Risk Score
        risk_score = await compute_risk_score(login_data.username, ip_address, device_info, country)

        # Step 3: Check if risk >= THRESHOLD
        if risk_score >= RISK_THRESHOLD:
            try:
                await issue_otp(login_data.username, user['email'], risk_score, country)
            except EmailDeliveryError as e:
                logger.error(f"Failed to send OTP email to {login_data.username}: {e}")
                raise HTTPException(status_code=503, detail="Could not send OTP email. Please try again.")

            await log_security_event(
                username=login_data.username,
                action="MFA_REQUIRED",
                ip_address=ip_address,
                device_info=device_info,
                risk_score=risk_score,
                details=f"Risk score: {risk_score}, OTP sent via email"
            )

            return {
                "success": True,
                "mfa_required": True,
                "risk_score": risk_score,
                "email": mask_email(user['email']),
                "message": "MFA required. OTP has been sent to your registered email."
            }

        # Step 4: Create Session Token (if low risk)
        session_token = await create_session(login_data.username, ip_address, device_info)
        await record_login_attempt(
            login_data.username, ip_address, device_info, country,
            risk_score=risk_score, success=True, mfa_required=False
        )
        await log_security_event(
            username=login_data.username,
            action="LOGIN_SUCCESS",
            ip_address=ip_address,
            device_info=device_info,
            risk_score=risk_score,
            details="Low risk login, no MFA required"
        )

        # Step 5: ALLOW
        return {
            "success": True,
            "mfa_required": False,
            "risk_score": risk_score,
            "token": session_token,
            "user": public_user(user),
            "message": "Login successful"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

@router.post("/verify-otp")
async def verify_otp(otp_data: OTPVerify, request: Request):
    """
    Verify OTP for MFA
    """
    try:
        ip_address = get_client_ip(request)
        device_info = get_device_fingerprint(request)

        try:
            otp_record = await consume_otp(otp_data.username, otp_data.otp)
        except OTPError as e:
            await log_security_event(
                username=otp_data.username,
                action="OTP_VERIFICATION_FAILED",
                ip_address=ip_address,
                device_info=device_info,
                risk_score=e.risk_score,
                details=e.reason
            )
            raise HTTPException(status_code=e.status_code, detail=e.detail)

        user = await db.users.find_one({'username': otp_data.username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        risk_score = otp_record.get('risk_score', 0)
        session_token = await create_session(otp_data.username, ip_address, device_info)
        await record_login_attempt(
            otp_data.username, ip_address, device_info, otp_record.get('country'),
            risk_score=risk_score, success=True, mfa_required=True
        )
        await log_security_event(
            username=otp_data.username,
            action="OTP_VERIFIED",
            ip_address=ip_address,
            device_info=device_info,
            risk_score=risk_score,
            details="MFA successful, session created"
        )

        return {
            "success": True,
            "token": session_token,
            "user": public_user(user),
            "message": "OTP verified successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="OTP verification failed")

@router.get("/verify-session")
async def verify_session(token: str):
    """
    Verify if session token is valid
    """
    try:
        session = await get_active_session(token)
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        user = await db.users.find_one({'username': session['username']})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "success": True,
            "user": public_user(user)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Session verification failed")
