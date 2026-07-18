# Installation Guide

## Quick Start

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB connection string

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
- Python 3.8+
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
- Try logging in from different browsers
- Failed login attempts increase risk score
- The system will show OTP on screen (demo mode)

For production deployment:
- Integrate SMS/Email service for OTP delivery
- Remove OTP display from verification page
- Configure production MongoDB instance
- Set up proper CORS origins
- Use environment-specific configurations

## Troubleshooting
- MongoDB not running: `mongod --dbpath /path/to/db`
- Port conflicts: Change ports in .env files
- Module not found: Reinstall dependencies
- CORS errors: Check CORS_ORIGINS in backend/.env
