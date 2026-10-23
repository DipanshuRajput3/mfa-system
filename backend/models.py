import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

def to_document(model: BaseModel) -> dict:
    """Serialize a model for MongoDB, storing datetimes as ISO strings"""
    return {
        key: value.isoformat() if isinstance(value, datetime) else value
        for key, value in model.model_dump().items()
    }

# ============ REQUEST MODELS ============

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

# ============ DATABASE MODELS ============

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
    country: Optional[str] = None
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
    risk_score: int
    country: Optional[str] = None
    failed_attempts: int = 0
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
