import logging

from fastapi import APIRouter, Depends, HTTPException

from database import db
from services.sessions import get_current_username

router = APIRouter(prefix="/security")
logger = logging.getLogger(__name__)

@router.get("/logs")
async def get_security_logs(limit: int = 50, username: str = Depends(get_current_username)):
    """
    Get security logs for the authenticated user
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

@router.get("/login-attempts")
async def get_login_attempts(limit: int = 20, username: str = Depends(get_current_username)):
    """
    Get login attempts for the authenticated user
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
