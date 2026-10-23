import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, User, Lock, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      const data = response.data;

      if (data.success) {
        if (data.mfa_required) {
          // Store username and masked email temporarily for verification page
          sessionStorage.setItem('mfa_username', formData.username);
          sessionStorage.setItem('mfa_email', data.email || '');
          sessionStorage.setItem('risk_score', data.risk_score);
          navigate('/verify-otp');
        } else {
          // Low risk login, no MFA needed
          onLogin(data.user, data.token);
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="ui-icon-badge w-16 h-16 mb-5">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="ui-heading text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Multi-Factor Authentication
          </h1>
          <p className="ui-muted">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="ui-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="ui-alert-error px-4 py-3 text-sm flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="ui-label mb-2">Username</label>
              <div className="relative">
                <User className="ui-input-icon" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="ui-input w-full pl-11 pr-4 py-3"
                  placeholder="Enter your username"
                  required
                  data-testid="login-username-input"
                />
              </div>
            </div>

            <div>
              <label className="ui-label mb-2">Password</label>
              <div className="relative">
                <Lock className="ui-input-icon" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="ui-input w-full pl-11 pr-4 py-3"
                  placeholder="Enter your password"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ui-btn-primary w-full py-3 px-4"
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="ui-muted mt-6 text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="ui-link">
              Create one
            </Link>
          </p>
        </div>

        {/* Security Info */}
        <div className="ui-callout mt-6 p-5">
          <h3 className="ui-accent font-semibold mb-2 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Smart Security Detection
          </h3>
          <p className="ui-muted text-sm leading-relaxed">
            Our system analyzes your login behavior, device, location, and other factors to compute a risk score. If the risk is high, you'll be prompted for additional verification via OTP.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
