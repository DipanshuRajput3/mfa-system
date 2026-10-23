from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import random
import string
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class OTPVerify(BaseModel):
    username: str
    otp: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    full_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class LoginAttempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    ip_address: str
    device_info: str
    location: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    risk_score: int
    success: bool
    mfa_required: bool

class SessionToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    token: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    ip_address: str
    device_info: str

class OTPRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    otp: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    is_used: bool = False

class SecurityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    action: str
    ip_address: str
    device_info: str
    risk_score: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[str] = None

# ============ HELPER FUNCTIONS ============

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def generate_session_token() -> str:
    """Generate secure session token"""
    return hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()

def get_client_ip(request: Request) -> str:
    """Get real client IP (works behind proxies like Render)"""
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'

def get_device_fingerprint(request: Request) -> str:
    """Create device fingerprint from user agent"""
    user_agent = request.headers.get('user-agent', 'Unknown')
    return hashlib.md5(user_agent.encode()).hexdigest()[:16]

async def compute_risk_score(username: str, ip_address: str, device_info: str) -> int:
    """
    Compute risk score based on:
    - IP address history
    - Device fingerprint history
    - Failed login attempts
    - Time of access
    - Geographic location (simulated)
    
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
    current_hour = datetime.now(timezone.utc).hour
    if current_hour < 6 or current_hour > 22:  # Late night/early morning
        risk_score += 15
    
    return min(risk_score, 100)  # Cap at 100

async def log_security_event(username: str, action: str, ip_address: str, device_info: str, risk_score: int, details: str = None):
    """Log security event to database"""
    log = SecurityLog(
        username=username,
        action=action,
        ip_address=ip_address,
        device_info=device_info,
        risk_score=risk_score,
        details=details
    )
    doc = log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.security_logs.insert_one(doc)

# ============ API ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "Multi-Factor Authentication System API"}

@api_router.post("/auth/register")
async def register_user(user_data: UserRegister, request: Request):
    """
    Register a new user
    """
    try:
        # Check if username already exists
        existing_user = await db.users.find_one({'username': user_data.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Check if email already exists
        existing_email = await db.users.find_one({'email': user_data.email})
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Create user
        password_hash = hash_password(user_data.password)
        user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=password_hash,
            full_name=user_data.full_name
        )
        
        doc = user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        
        # Log security event
        ip_address = get_client_ip(request)
        device_info = get_device_fingerprint(request)
        await log_security_event(
            username=user_data.username,
            action="USER_REGISTERED",
            ip_address=ip_address,
            device_info=device_info,
            risk_score=0,
            details="New user registration"
        )
        
        return {
            "success": True,
            "message": "User registered successfully",
            "username": user_data.username
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin, request: Request):
    """
    Login user with risk-based MFA
    Algorithm implementation from research paper
    """
    try:
        ip_address = get_client_ip(request)
        device_info = get_device_fingerprint(request)
        
        # Step 1: Validate Password
        user = await db.users.find_one({'username': login_data.username})
        if not user or not verify_password(login_data.password, user['password_hash']):
            # Log failed attempt
            attempt = LoginAttempt(
                username=login_data.username,
                ip_address=ip_address,
                device_info=device_info,
                risk_score=0,
                success=False,
                mfa_required=False
            )
            doc = attempt.model_dump()
            doc['timestamp'] = doc['timestamp'].isoformat()
            await db.login_attempts.insert_one(doc)
            
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
        risk_score = await compute_risk_score(login_data.username, ip_address, device_info)
        
        # Step 3: Check if risk >= THRESHOLD (50 is our threshold)
        THRESHOLD = 50
        mfa_required = risk_score >= THRESHOLD
        
        if mfa_required:
            # Generate and store OTP
            otp = generate_otp()
            otp_record = OTPRecord(
                username=login_data.username,
                otp=otp,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
            )
            doc = otp_record.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['expires_at'] = doc['expires_at'].isoformat()
            await db.otp_records.insert_one(doc)
            
            # Log MFA requirement
            await log_security_event(
                username=login_data.username,
                action="MFA_REQUIRED",
                ip_address=ip_address,
                device_info=device_info,
                risk_score=risk_score,
                details=f"Risk score: {risk_score}, OTP sent"
            )
            
            logger.info(f"OTP for {login_data.username}: {otp}")  # In production, send via SMS/Email
            
            return {
                "success": True,
                "mfa_required": True,
                "risk_score": risk_score,
                "message": "MFA required. OTP has been generated.",
                "otp": otp  # In production, send via SMS/Email instead of returning
            }
        
        # Step 4: Create Session Token (if low risk)
        session_token = generate_session_token()
        session = SessionToken(
            username=login_data.username,
            token=session_token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            ip_address=ip_address,
            device_info=device_info
        )
        doc = session.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['expires_at'] = doc['expires_at'].isoformat()
        await db.sessions.insert_one(doc)
        
        # Log successful login
        attempt = LoginAttempt(
            username=login_data.username,
            ip_address=ip_address,
            device_info=device_info,
            risk_score=risk_score,
            success=True,
            mfa_required=False
        )
        doc = attempt.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.login_attempts.insert_one(doc)
        
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
            "user": {
                "username": user['username'],
                "email": user['email'],
                "full_name": user['full_name']
            },
            "message": "Login successful"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

@api_router.post("/auth/verify-otp")
async def verify_otp(otp_data: OTPVerify, request: Request):
    """
    Verify OTP for MFA
    """
    try:
        ip_address = get_client_ip(request)
        device_info = get_device_fingerprint(request)
        
        # Find valid OTP
        otp_record = await db.otp_records.find_one({
            'username': otp_data.username,
            'otp': otp_data.otp,
            'is_used': False
        })
        
        if not otp_record:
            await log_security_event(
                username=otp_data.username,
                action="OTP_VERIFICATION_FAILED",
                ip_address=ip_address,
                device_info=device_info,
                risk_score=0,
                details="Invalid OTP"
            )
            raise HTTPException(status_code=401, detail="Invalid OTP")
        
        # Check if OTP is expired
        expires_at = datetime.fromisoformat(otp_record['expires_at'])
        if expires_at < datetime.now(timezone.utc):
            await log_security_event(
                username=otp_data.username,
                action="OTP_VERIFICATION_FAILED",
                ip_address=ip_address,
                device_info=device_info,
                risk_score=0,
                details="Expired OTP"
            )
            raise HTTPException(status_code=401, detail="OTP expired")
        
        # Mark OTP as used
        await db.otp_records.update_one(
            {'id': otp_record['id']},
            {'$set': {'is_used': True}}
        )
        
        # Get user
        user = await db.users.find_one({'username': otp_data.username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create session token
        session_token = generate_session_token()
        session = SessionToken(
            username=otp_data.username,
            token=session_token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            ip_address=ip_address,
            device_info=device_info
        )
        doc = session.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['expires_at'] = doc['expires_at'].isoformat()
        await db.sessions.insert_one(doc)
        
        # Log successful login with MFA
        attempt = LoginAttempt(
            username=otp_data.username,
            ip_address=ip_address,
            device_info=device_info,
            risk_score=0,
            success=True,
            mfa_required=True
        )
        doc = attempt.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.login_attempts.insert_one(doc)
        
        await log_security_event(
            username=otp_data.username,
            action="OTP_VERIFIED",
            ip_address=ip_address,
            device_info=device_info,
            risk_score=0,
            details="MFA successful, session created"
        )
        
        return {
            "success": True,
            "token": session_token,
            "user": {
                "username": user['username'],
                "email": user['email'],
                "full_name": user['full_name']
            },
            "message": "OTP verified successfully"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"OTP verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="OTP verification failed")

@api_router.get("/auth/verify-session")
async def verify_session(token: str):
    """
    Verify if session token is valid
    """
    try:
        session = await db.sessions.find_one({'token': token})
        if not session:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        # Check if session is expired
        expires_at = datetime.fromisoformat(session['expires_at'])
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        # Get user
        user = await db.users.find_one({'username': session['username']})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "user": {
                "username": user['username'],
                "email": user['email'],
                "full_name": user['full_name']
            }
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Session verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Session verification failed")

@api_router.get("/security/logs")
async def get_security_logs(username: str, limit: int = 50):
    """
    Get security logs for a user
    """
    try:
        logs = await db.security_logs.find(
            {'username': username},
            {'_id': 0}
        ).sort('timestamp', -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "logs": logs
        }
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch logs")

@api_router.get("/security/login-attempts")
async def get_login_attempts(username: str, limit: int = 20):
    """
    Get login attempts for a user
    """
    try:
        attempts = await db.login_attempts.find(
            {'username': username},
            {'_id': 0}
        ).sort('timestamp', -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "attempts": attempts
        }
    except Exception as e:
        logger.error(f"Error fetching login attempts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch login attempts")

@api_router.get("/stats/overview")
async def get_stats_overview(username: str):
    """
    Get overview statistics for a user
    """
    try:
        # Total login attempts
        total_attempts = await db.login_attempts.count_documents({'username': username})
        
        # Successful logins
        successful_logins = await db.login_attempts.count_documents({
            'username': username,
            'success': True
        })
        
        # Failed logins
        failed_logins = await db.login_attempts.count_documents({
            'username': username,
            'success': False
        })
        
        # MFA required count
        mfa_required = await db.login_attempts.count_documents({
            'username': username,
            'mfa_required': True
        })
        
        # Average risk score
        pipeline = [
            {'$match': {'username': username}},
            {'$group': {'_id': None, 'avg_risk': {'$avg': '$risk_score'}}}
        ]
        result = await db.login_attempts.aggregate(pipeline).to_list(1)
        avg_risk_score = round(result[0]['avg_risk'], 2) if result else 0
        
        return {
            "success": True,
            "stats": {
                "total_attempts": total_attempts,
                "successful_logins": successful_logins,
                "failed_logins": failed_logins,
                "mfa_required": mfa_required,
                "avg_risk_score": avg_risk_score
            }
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app
app.include_router(api_router)



@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
