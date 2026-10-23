# Multi-Factor Authentication System

## Based on Research Paper: "Enhancing Web Security Using Multi-Factor Authentication"

🔗 **Live Demo:** https://mfa-system-kappa.vercel.app

This project implements a comprehensive Risk-Based Multi-Factor Authentication (RB-MFA) system as described in the research paper. The system dynamically enforces MFA challenges based on contextual risk assessment.

---

## 🔐 Features Implemented

### Core Authentication Features
- **User Registration & Login** - Secure user account management
- **Risk-Based MFA** - Dynamic OTP verification triggered by risk score
- **Device Fingerprinting** - Hash of User-Agent, Accept-Language and platform headers
- **Session Management** - Secure token-based sessions (Bearer token on protected APIs)
- **Email OTP** - 6-digit OTP sent to the registered email via Brevo's email API (free plan)
- **Security Logging** - Comprehensive audit trail

### Risk Score Computation
The system calculates risk scores (0-100) based on:
| Factor | Points |
|---|---|
| Failed login attempts (last 24 hours) | +15 each, max 40 |
| Unknown IP address | +25 |
| Unknown device fingerprint | +20 |
| Unusual hours (before 6 AM / after 10 PM, Asia/Kolkata) | +15 |
| Country differs from last successful login (via ip-api.com) | +15 |

MFA is required when the score is **≥ 50**.

### Risk Levels
- **Low (0-30)**: Trusted login, no MFA required
- **Medium (31-60)**: Some risk factors present
- **High (61-100)**: Multiple risk factors, MFA required

---

## 🏗️ Architecture

### Algorithm Implementation (From Research Paper)

```
Algorithm 1: Risk-Based Multi-Factor Authentication

Input: username, password, context (IP, device, location, time)
Output: ALLOW / DENY

1. If ValidatePassword(username, password) = FALSE → DENY
2. risk ← ComputeRisk(context)
3. If risk ≥ THRESHOLD then
4.     If VerifyOTP() = FALSE → DENY
5. End If
6. CreateSessionToken()
7. ALLOW
```

### System Components

**Backend (FastAPI - Python)**
- Password validation with bcrypt hashing
- Risk score computation engine
- OTP generation (`secrets` module), email delivery & verification (max 5 attempts)
- Device fingerprinting & IP geolocation
- Session token management
- Security event logging
- Threat detection system

**Frontend (React)**
- User registration interface
- Login with real-time risk assessment
- OTP verification page
- Security dashboard with statistics
- Login attempt monitoring
- Security logs viewer

**Database (MongoDB)**
- Users collection
- Login attempts tracking
- OTP records management
- Session tokens storage
- Security logs repository

---

## 📊 Dashboard Features

### Statistics Overview
- Total login attempts
- Successful vs. failed logins
- MFA requirement count
- Average risk score

### Security Monitoring
- Real-time login attempts table
- Comprehensive security activity log
- Risk score visualization
- Device and IP tracking

---

## 🚀 Technology Stack

- **Backend**: FastAPI (Python 3.x)
- **Frontend**: React 19 with React Router
- **Database**: MongoDB
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Authentication**: bcrypt, JWT-style session tokens
- **HTTP Client**: Axios

---

## 📦 Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 16+
- MongoDB

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup
```bash
cd frontend
yarn install
yarn start
```

### Environment Variables

**Backend (.env)**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=mfa_database
CORS_ORIGINS=http://localhost:3000,https://mfa-system-kappa.vercel.app
BREVO_API_KEY=your-brevo-api-key
MAIL_FROM=verified-sender@example.com
MAIL_FROM_NAME=MFA System
```

| Variable | Description |
|---|---|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | Database name |
| `CORS_ORIGINS` | Comma-separated allowed origins (default `http://localhost:3000`). `*` allows all origins but disables credentials |
| `BREVO_API_KEY` | Brevo API key (Brevo → SMTP & API → API Keys) |
| `MAIL_FROM` | Sender email, verified in Brevo (Senders) |
| `MAIL_FROM_NAME` | Optional sender name (default `MFA System`) |

`.env` files are git-ignored. Set real values in the Render / Vercel dashboard and never commit them. See [INSTALLATION.md](INSTALLATION.md) for the Brevo setup steps.

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 🔒 Security Features

### Password Security
- Bcrypt hashing with salt
- Minimum 6 character requirement
- Secure password validation

### Session Security
- 24-hour session expiration
- Token-based authentication (`Authorization: Bearer <token>`)
- Automatic session cleanup

### Risk Mitigation
- **Credential Stuffing**: MFA for suspicious logins
- **Phishing**: Second factor verification
- **Brute Force**: Progressive risk score increase
- **Session Replay**: Token validation

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login with risk assessment
- `POST /api/auth/verify-otp` - OTP verification
- `GET /api/auth/verify-session` - Session validation

### Security & Monitoring
These require an `Authorization: Bearer <token>` header; the username is taken from the session (401 if the token is missing, invalid or expired).
- `GET /api/security/logs` - Security event logs
- `GET /api/security/login-attempts` - Login attempt history
- `GET /api/stats/overview` - Statistics overview

---

## 🎯 Usage Flow

1. **Registration**: User creates account with username, email, password
2. **Login Attempt**: User enters credentials
3. **Risk Assessment**: System computes risk score
4. **Decision Point**:
   - Low Risk (< 50): Direct login, session created
   - High Risk (≥ 50): OTP challenge triggered
5. **MFA Verification** (if required): OTP is emailed to the user (valid 5 minutes, max 5 wrong attempts → 429)
6. **Session Created**: Secure token issued for 24 hours
7. **Dashboard Access**: View security statistics and logs

---

## 🔬 Research Paper Implementation

This project faithfully implements the concepts from the research paper:

✅ **Multi-Factor Authentication** - OTP-based second factor
✅ **Risk-Based Authentication** - Dynamic MFA triggering
✅ **Device Fingerprinting** - User agent, language & platform based identification
✅ **Contextual Information** - IP, device, time, location
✅ **Threshold Management** - Configurable risk threshold
✅ **Session Management** - Secure token issuance
✅ **Logging & Monitoring** - Comprehensive audit trail
✅ **Threat Detection** - Failed attempt tracking

---

## 🎨 User Interface

### Pages
1. **Registration Page** - Clean, modern signup form
2. **Login Page** - Secure authentication with risk indicator
3. **OTP Verification** - 6-digit code entry with auto-focus
4. **Dashboard** - Comprehensive security overview
   - Statistics cards
   - Login attempts table
   - Security logs timeline

### Design Features
- Clean dark theme (deep navy background, indigo primary, cyan accent) using the Inter font
- Theme colors defined once as CSS variables in `frontend/src/App.css`
- Responsive layout (mobile-friendly)
- Risk score bar and color-coded risk badges (green/amber/red)
- Intuitive navigation

---

## 🧪 Testing

### OTP Delivery
OTPs are emailed to the user's registered address via Brevo's HTTPS email API (it works on hosts that block SMTP ports, such as Render's free plan) and are never returned in API responses. The verification page only shows the masked address the OTP was sent to.

### Test Scenarios
1. **Low Risk Login**: Same device, known IP → No MFA
2. **High Risk Login**: New device, unknown IP → MFA required
3. **Failed Attempts**: Multiple failures → Increased risk score
4. **Unusual Hours**: Late night login → Risk score increase

---

## 🔮 Future Enhancements (From Research Paper)

- AI-based anomaly detection
- WebAuthn / FIDO2 support
- Push notification verification
- Biometric authentication
- SMS OTP delivery
- Advanced threat intelligence

---

## 📚 Research Paper Reference

**Title**: Enhancing Web Security Using Multi-Factor Authentication

**Key Concepts**:
- Risk-Based Multi-Factor Authentication (RB-MFA)
- Dynamic risk scoring model
- Contextual enforcement of MFA
- Adaptive selection of authentication factors

**Technologies Referenced**:
- Multi-Factor Authentication (MFA)
- One-Time Password (OTP)
- Device Fingerprinting
- Risk-Based Authentication
- Session Token Management

---

## 📄 License

This project is implemented based on academic research for educational purposes.

---

## 👨‍💻 Developer Notes

- All passwords are hashed using bcrypt
- OTPs and session tokens are generated with Python's `secrets` module
- MongoDB ObjectID avoided, using UUIDs for consistency
- Hot reload enabled for development
- CORS origins configured via the `CORS_ORIGINS` env variable
- Comprehensive error handling implemented

---

## 🎯 Project Structure

```
mfa-system/
├── backend/
│   ├── server.py          # App entrypoint (uvicorn server:app): CORS + routers
│   ├── config.py          # Environment settings & constants
│   ├── database.py        # MongoDB connection
│   ├── models.py          # Pydantic request & database models
│   ├── routes/            # API endpoints
│   │   ├── auth.py        # register, login, verify-otp, verify-session
│   │   ├── security.py    # security logs, login attempts
│   │   └── stats.py       # statistics overview
│   ├── services/          # Business logic
│   │   ├── risk.py        # Risk score engine
│   │   ├── context.py     # Client IP, device fingerprint, geolocation
│   │   ├── otp.py         # OTP issue & verification
│   │   ├── notifications.py # OTP email via Brevo
│   │   ├── sessions.py    # Session tokens & Bearer auth
│   │   ├── passwords.py   # bcrypt hashing
│   │   └── audit.py       # Login attempts & security logs
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Backend environment variables (not committed)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Register.js        # Registration page
│   │   │   ├── Login.js           # Login page
│   │   │   ├── OTPVerification.js # OTP verification page
│   │   │   └── Dashboard.js       # Security dashboard
│   │   ├── App.js                 # Main application component
│   │   ├── App.css                # Custom styles
│   │   └── index.js               # Entry point
│   ├── package.json               # Node dependencies
│   └── .env                       # Frontend environment variables
│
└── README.md
```

---

## 🌟 Highlights

✨ **Complete Implementation** - All features from research paper
✨ **Production-Ready** - Error handling, validation, security
✨ **Modern UI** - Beautiful, responsive interface
✨ **Comprehensive Logging** - Full audit trail
✨ **Real-time Monitoring** - Live security statistics
✨ **Scalable Architecture** - Clean, modular code

---

**Built with ❤️ based on academic research in web security**
