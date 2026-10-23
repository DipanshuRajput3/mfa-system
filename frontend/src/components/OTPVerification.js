import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, KeyRound, AlertCircle, Mail } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OTPVerification = ({ onLogin }) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    const mfaUsername = sessionStorage.getItem('mfa_username');
    const mfaEmail = sessionStorage.getItem('mfa_email');
    const mfaRiskScore = sessionStorage.getItem('risk_score');

    if (!mfaUsername) {
      navigate('/login');
      return;
    }

    setUsername(mfaUsername);
    setMaskedEmail(mfaEmail || 'your registered email');
    setRiskScore(parseInt(mfaRiskScore) || 0);
  }, [navigate]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('');
    while (newOtp.length < 6) newOtp.push('');
    setOtp(newOtp);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/verify-otp`, {
        username,
        otp: otpValue,
      });

      if (response.data.success) {
        sessionStorage.removeItem('mfa_username');
        sessionStorage.removeItem('mfa_email');
        sessionStorage.removeItem('risk_score');
        onLogin(response.data.user, response.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = () => {
    if (riskScore <= 30) return { text: 'Low', level: 'low' };
    if (riskScore <= 60) return { text: 'Medium', level: 'medium' };
    return { text: 'High', level: 'high' };
  };

  const riskLevel = getRiskLevel();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="ui-icon-badge w-16 h-16 mb-5">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="ui-heading text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Verify Your Identity
          </h1>
          <p className="ui-muted">Enter the 6-digit code to continue</p>
        </div>

        {/* Risk Score Alert */}
        <div className="ui-card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <AlertCircle className={`w-5 h-5 mr-2 risk-${riskLevel.level}`} />
              <span className="ui-heading font-medium">Risk Level</span>
              <span className={`risk-badge-${riskLevel.level} ml-2 px-2.5 py-0.5 text-xs font-medium`}>
                {riskLevel.text}
              </span>
            </div>
            <span className={`text-2xl font-bold risk-${riskLevel.level}`}>{riskScore}</span>
          </div>
          <div className="risk-bar">
            <div
              className={`risk-bar-fill risk-${riskLevel.level}`}
              style={{ width: `${Math.min(riskScore, 100)}%` }}
            />
          </div>
          <p className="ui-muted text-sm mt-3">
            Additional verification required due to elevated risk factors.
          </p>
        </div>

        {/* OTP Form */}
        <div className="ui-card p-6 sm:p-8">
          <div className="ui-callout flex items-center px-4 py-3 mb-6 text-sm" data-testid="otp-sent-message">
            <Mail className="ui-accent w-5 h-5 mr-2 flex-shrink-0" />
            <span className="ui-muted">
              OTP sent to <span className="ui-heading font-medium">{maskedEmail}</span>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="ui-alert-error px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="ui-label text-center mb-4">
                Enter OTP Code
              </label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="ui-input w-11 sm:w-12 h-14 text-center text-2xl font-bold"
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="ui-btn-primary w-full py-3 px-4"
              data-testid="verify-otp-button"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="ui-link text-sm"
            >
              ← Back to login
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="ui-callout mt-6 p-5">
          <h3 className="ui-accent font-semibold mb-2 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Why was I asked for MFA?
          </h3>
          <p className="ui-muted text-sm leading-relaxed">
            Our system detected unusual activity such as a new device, different location, or other risk factors. This additional verification helps protect your account from unauthorized access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
