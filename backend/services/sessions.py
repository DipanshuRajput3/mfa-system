import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Header, HTTPException

from config import SESSION_TTL_HOURS
from database import db
from models import SessionToken, to_document

def generate_session_token() -> str:
    """Generate secure session token"""
    return secrets.token_hex(32)

async def create_session(username: str, ip_address: str, device_info: str) -> str:
    """Create and persist a session token"""
    session_token = generate_session_token()
    session = SessionToken(
        username=username,
        token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS),
        ip_address=ip_address,
        device_info=device_info
    )
    await db.sessions.insert_one(to_document(session))
    return session_token

async def get_active_session(token: str) -> Optional[dict]:
    """Return session document if token exists and has not expired"""
    session = await db.sessions.find_one({'token': token})
    if not session or datetime.fromisoformat(session['expires_at']) < datetime.now(timezone.utc):
        return None
    return session

async def get_current_username(authorization: Optional[str] = Header(None)) -> str:
    """Dependency: resolve username from 'Authorization: Bearer <token>' header"""
    scheme, _, token = (authorization or '').partition(' ')
    if scheme.lower() != 'bearer' or not token.strip():
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    session = await get_active_session(token.strip())
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return session['username']
