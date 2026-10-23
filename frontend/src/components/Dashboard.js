import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Shield,
  LogOut,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Fingerprint,
  MapPin,
  TrendingUp
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getRiskLevel = (score) => {
  if (score <= 30) return { text: 'Low', level: 'low' };
  if (score <= 60) return { text: 'Medium', level: 'medium' };
  return { text: 'High', level: 'high' };
};

const StatCard = ({ icon: Icon, iconClass, label, value, valueClass = 'ui-heading', testId, children }) => (
  <div className="ui-card p-5">
    <div className="flex items-center justify-between mb-4">
      <p className="ui-muted text-sm font-medium">{label}</p>
      <Icon className={`w-5 h-5 ${iconClass}`} />
    </div>
    <p className={`text-3xl font-bold tracking-tight ${valueClass}`} data-testid={testId}>{value}</p>
    {children}
  </div>
);

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('session_token')}` },
      };
      try {
        const [statsRes, logsRes, attemptsRes] = await Promise.all([
          axios.get(`${API}/stats/overview`, config),
          axios.get(`${API}/security/logs?limit=50`, config),
          axios.get(`${API}/security/login-attempts?limit=20`, config),
        ]);

        setStats(statsRes.data.stats);
        setLogs(logsRes.data.logs);
        setLoginAttempts(attemptsRes.data.attempts);
      } catch (error) {
        if (error.response?.status === 401) {
          onLogout();
          navigate('/login', { replace: true });
          return;
        }
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, onLogout]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return <CheckCircle className="w-5 h-5 risk-low" />;
      case 'LOGIN_FAILED':
      case 'OTP_VERIFICATION_FAILED':
        return <XCircle className="w-5 h-5 risk-high" />;
      case 'MFA_REQUIRED':
        return <AlertTriangle className="w-5 h-5 risk-medium" />;
      case 'OTP_VERIFIED':
        return <CheckCircle className="w-5 h-5 ui-accent" />;
      case 'USER_REGISTERED':
        return <Activity className="w-5 h-5 ui-primary" />;
      default:
        return <Activity className="w-5 h-5 ui-muted" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="ui-muted text-lg">Loading...</div>
      </div>
    );
  }

  const avgRisk = stats ? getRiskLevel(stats.avg_risk_score) : null;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div className="flex items-center min-w-0">
            <div className="ui-icon-badge w-12 h-12 mr-4 flex-shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="ui-heading text-2xl sm:text-3xl font-bold tracking-tight" data-testid="dashboard-title">
                Security Dashboard
              </h1>
              <p className="ui-muted truncate">Welcome back, {user.full_name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="ui-btn-secondary px-4 py-2"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mb-8">
            <StatCard
              icon={Activity}
              iconClass="ui-accent"
              label="Total Attempts"
              value={stats.total_attempts}
              testId="stat-total-attempts"
            />
            <StatCard
              icon={CheckCircle}
              iconClass="risk-low"
              label="Successful Logins"
              value={stats.successful_logins}
              valueClass="risk-low"
              testId="stat-successful-logins"
            />
            <StatCard
              icon={XCircle}
              iconClass="risk-high"
              label="Failed Attempts"
              value={stats.failed_logins}
              valueClass="risk-high"
              testId="stat-failed-logins"
            />
            <StatCard
              icon={Shield}
              iconClass="risk-medium"
              label="MFA Required"
              value={stats.mfa_required}
              valueClass="risk-medium"
              testId="stat-mfa-required"
            />
            <StatCard
              icon={TrendingUp}
              iconClass="ui-primary"
              label="Avg Risk Score"
              value={stats.avg_risk_score}
              valueClass={`risk-${avgRisk.level}`}
              testId="stat-avg-risk"
            >
              <div className="risk-bar mt-3">
                <div
                  className={`risk-bar-fill risk-${avgRisk.level}`}
                  style={{ width: `${Math.min(stats.avg_risk_score, 100)}%` }}
                />
              </div>
            </StatCard>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`ui-tab px-5 py-2.5 ${activeTab === 'overview' ? 'ui-tab-active' : ''}`}
            data-testid="tab-overview"
          >
            Login Attempts
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`ui-tab px-5 py-2.5 ${activeTab === 'logs' ? 'ui-tab-active' : ''}`}
            data-testid="tab-security-logs"
          >
            Security Logs
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="ui-card overflow-hidden">
            <div className="ui-card-header px-5 py-4 sm:px-6">
              <h2 className="ui-heading text-lg font-semibold">Recent Login Attempts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="ui-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Risk Score</th>
                    <th className="px-5 py-3">IP Address</th>
                    <th className="px-5 py-3">Device</th>
                    <th className="px-5 py-3">MFA</th>
                    <th className="px-5 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loginAttempts.map((attempt) => {
                    const risk = getRiskLevel(attempt.risk_score);
                    return (
                      <tr key={attempt.id}>
                        <td className="px-5 py-3.5">
                          {attempt.success ? (
                            <span className="flex items-center risk-low font-medium">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Success
                            </span>
                          ) : (
                            <span className="flex items-center risk-high font-medium">
                              <XCircle className="w-4 h-4 mr-2" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`risk-badge-${risk.level} px-2.5 py-1 text-xs font-medium`}>
                            {attempt.risk_score} - {risk.text}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 ui-heading font-mono text-xs">{attempt.ip_address}</td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center ui-heading font-mono text-xs">
                            <Fingerprint className="w-4 h-4 mr-2 ui-muted" />
                            {attempt.device_info}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {attempt.mfa_required ? (
                            <span className="risk-medium">Required</span>
                          ) : (
                            <span className="ui-muted">Not Required</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 ui-muted">
                          {formatTimestamp(attempt.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="ui-card overflow-hidden">
            <div className="ui-card-header px-5 py-4 sm:px-6">
              <h2 className="ui-heading text-lg font-semibold">Security Activity Log</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-3 max-h-[600px] overflow-y-auto">
              {logs.map((log) => {
                const risk = getRiskLevel(log.risk_score);
                return (
                  <div key={log.id} className="ui-list-item flex items-start gap-4 p-4">
                    <div className="mt-0.5 flex-shrink-0">{getActionIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="ui-heading font-medium">
                            {log.action.replace(/_/g, ' ')}
                          </h3>
                          <p className="ui-muted text-sm mt-1">{log.details}</p>
                        </div>
                        <span className={`risk-badge-${risk.level} px-2.5 py-1 text-xs font-medium`}>
                          Risk: {log.risk_score}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ui-muted text-xs">
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          {log.ip_address}
                        </span>
                        <span className="flex items-center">
                          <Fingerprint className="w-3.5 h-3.5 mr-1" />
                          {log.device_info}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Risk Assessment Info */}
        <div className="ui-callout mt-8 p-5 sm:p-6">
          <h3 className="ui-heading font-semibold text-lg mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 ui-accent" />
            How Risk-Based Authentication Works
          </h3>
          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <h4 className="risk-low font-semibold mb-2">Low Risk (0-30)</h4>
              <p className="ui-muted text-sm leading-relaxed">
                Known device, familiar location, normal access time. Login without MFA.
              </p>
            </div>
            <div>
              <h4 className="risk-medium font-semibold mb-2">Medium Risk (31-60)</h4>
              <p className="ui-muted text-sm leading-relaxed">
                Some unusual factors detected. May require MFA based on threshold.
              </p>
            </div>
            <div>
              <h4 className="risk-high font-semibold mb-2">High Risk (61-100)</h4>
              <p className="ui-muted text-sm leading-relaxed">
                Multiple risk factors: new device, unknown location, failed attempts. MFA required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
