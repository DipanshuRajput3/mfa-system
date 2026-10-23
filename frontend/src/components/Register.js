import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, Mail, User, Lock, UserPlus, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
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
      const response = await axios.post(`${API}/auth/register`, formData);
      if (response.data.success) {
        alert('Registration successful! Please login.');
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
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
          <p className="ui-muted">Create your secure account</p>
        </div>

        {/* Registration Form */}
        <div className="ui-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="ui-alert-error px-4 py-3 text-sm flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="ui-label mb-2">Full Name</label>
              <div className="relative">
                <User className="ui-input-icon" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="ui-input w-full pl-11 pr-4 py-3"
                  placeholder="John Doe"
                  required
                  data-testid="register-fullname-input"
                />
              </div>
            </div>

            <div>
              <label className="ui-label mb-2">Username</label>
              <div className="relative">
                <UserPlus className="ui-input-icon" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="ui-input w-full pl-11 pr-4 py-3"
                  placeholder="johndoe"
                  required
                  data-testid="register-username-input"
                />
              </div>
            </div>

            <div>
              <label className="ui-label mb-2">Email</label>
              <div className="relative">
                <Mail className="ui-input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="ui-input w-full pl-11 pr-4 py-3"
                  placeholder="john@example.com"
                  required
                  data-testid="register-email-input"
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
                  placeholder="••••••••"
                  required
                  minLength="6"
                  data-testid="register-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ui-btn-primary w-full py-3 px-4"
              data-testid="register-submit-button"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="ui-muted mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="ui-link">
              Sign in
            </Link>
          </p>
        </div>

        {/* Info Section */}
        <div className="ui-callout mt-6 p-5">
          <h3 className="ui-accent font-semibold mb-3 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Enhanced Security Features
          </h3>
          <ul className="ui-muted text-sm space-y-2">
            <li className="flex items-start">
              <span className="ui-accent mr-2">•</span>
              <span>Risk-based Multi-Factor Authentication</span>
            </li>
            <li className="flex items-start">
              <span className="ui-accent mr-2">•</span>
              <span>Device fingerprinting for enhanced security</span>
            </li>
            <li className="flex items-start">
              <span className="ui-accent mr-2">•</span>
              <span>Comprehensive security logging and monitoring</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;
