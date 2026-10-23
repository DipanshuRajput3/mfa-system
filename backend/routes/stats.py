import logging

from fastapi import APIRouter, Depends, HTTPException

from database import db
from services.sessions import get_current_username

router = APIRouter(prefix="/stats")
logger = logging.getLogger(__name__)

@router.get("/overview")
async def get_stats_overview(username: str = Depends(get_current_username)):
    """
    Get overview statistics for the authenticated user
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
