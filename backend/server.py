"""App entrypoint (run with: uvicorn server:app). Endpoints live in routes/, logic in services/."""
import logging

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from config import BREVO_API_KEY, CORS_ORIGINS, MAIL_FROM
from database import client
from routes import auth, security, stats

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if not BREVO_API_KEY or not MAIL_FROM:
    logger.warning("BREVO_API_KEY / MAIL_FROM not set: logins that require MFA will fail with 503")

app = FastAPI()

# All endpoints are served under /api
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "Multi-Factor Authentication System API"}

api_router.include_router(auth.router)
api_router.include_router(security.router)
api_router.include_router(stats.router)

# CORS: credentials are disabled when "*" is used
allow_all_origins = '*' in CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'] if allow_all_origins else CORS_ORIGINS,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
