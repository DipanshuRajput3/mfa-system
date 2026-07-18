import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, KeyRound, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OTPVerification = ({ onLogin }) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    const mfaUsername = sessionStorage.getItem('mfa_username');
    const mfaOtp = sessionStorage.getItem('mfa_otp');
    const mfaRiskScore = sessionStorage.getItem('risk_score');
    
    if (!mfaUsername || !mfaOtp) {
      navigate('/login');
      return;
    }
    
    setUsername(mfaUsername);
    setGeneratedOtp(mfaOtp);
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
        sessionStorage.removeItem('mfa_otp');
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
    if (riskScore <= 30) return { text: 'Low', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' };
    if (riskScore <= 60) return { text: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' };
    return { text: 'High', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' };
  };

  const riskLevel = getRiskLevel();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/20 rounded-full">
              <KeyRound className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Verify Your Identity
          </h1>
          <p className="text-slate-400">Enter the 6-digit code to continue</p>
        </div>

        {/* Risk Score Alert */}
        <div className={`mb-6 ${riskLevel.bg} border ${riskLevel.border} rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className={`w-5 h-5 mr-2 ${riskLevel.color}`} />
              <span className="text-white font-medium">Risk Level: {riskLevel.text}</span>
            </div>
            <span className={`text-2xl font-bold ${riskLevel.color}`}>{riskScore}</span>
          </div>
          <p className="text-slate-300 text-sm mt-2">
            Additional verification required due to elevated risk factors.
          </p>
        </div>

        {/* OTP Display (For Demo) */}
        <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 mb-6">
          <p className="text-amber-400 text-sm font-medium mb-1">
            🚨 Demo Mode - Your OTP:
          </p>
          <p className="text-white text-2xl font-mono font-bold tracking-wider">
            {generatedOtp}
          </p>
          <p className="text-slate-400 text-xs mt-2">
            In production, this would be sent via SMS or Email
          </p>
        </div>

        {/* OTP Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-4 text-center">
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
                    className="w-12 h-14 text-center text-2xl font-bold bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="verify-otp-button"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              ← Back to login
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-8 bg-slate-800/30 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
          <h3 className="text-white font-semibold mb-2 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-400" />
            Why was I asked for MFA?
          </h3>
          <p className="text-slate-400 text-sm">
            Our system detected unusual activity such as a new device, different location, or other risk factors. This additional verification helps protect your account from unauthorized access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
