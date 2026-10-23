# Installation Guide

## Quick Start

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB connection string and Brevo API key

# Run the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend Setup
```bash
cd frontend
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your backend URL

# Start the application
yarn start
```

### 3. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

## Requirements
- Python 3.9+
- Node.js 16+
- MongoDB 4.4+
- Yarn package manager

## First User Registration
1. Navigate to http://localhost:3000
2. Click "Create one" on the login page
3. Fill in registration details
4. After registration, return to login

## Testing MFA
To trigger MFA (high risk scenario):
- Try logging in from a different browser or network
- Failed login attempts increase risk score
- The OTP is emailed to the registered address (requires `BREVO_API_KEY` / `MAIL_FROM` in `backend/.env`)

For production deployment:
- Set environment variables in the hosting dashboard (e.g. Render, Vercel); never commit `.env` files
- Configure production MongoDB instance
- Set `CORS_ORIGINS` to the deployed frontend URL
- OTP emails go through Brevo's HTTPS API, so they also work on Render's free plan (which blocks SMTP ports)

## Email OTP Setup (Brevo, free plan)
1. Create a free account at https://www.brevo.com
2. Add and verify a sender email under **Senders, Domains & Dedicated IPs → Senders**
3. Create an API key under **SMTP & API → API Keys**
4. Set `BREVO_API_KEY` and `MAIL_FROM` (the verified sender) in `backend/.env` locally, and in the Render dashboard for production

## Troubleshooting
- MongoDB not running: `mongod --dbpath /path/to/db`
- Port conflicts: Change ports in .env files
- Module not found: Reinstall dependencies
- CORS errors: Check CORS_ORIGINS in backend/.env
- OTP email not arriving: Check BREVO_API_KEY / MAIL_FROM, the spam folder, and the backend logs (Brevo's error message is logged). An "unrecognised IP address" error means Brevo's Authorised IPs check is blocking the server; allow the IP or turn that check off in Brevo's security settings
