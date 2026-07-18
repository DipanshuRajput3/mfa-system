import { useState, useEffect } from 'react';
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

const Dashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes, attemptsRes] = await Promise.all([
        axios.get(`${API}/stats/overview?username=${user.username}`),
        axios.get(`${API}/security/logs?username=${user.username}&limit=50`),
        axios.get(`${API}/security/login-attempts?username=${user.username}&limit=20`),
      ]);

      setStats(statsRes.data.stats);
      setLogs(logsRes.data.logs);
      setLoginAttempts(attemptsRes.data.attempts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (score) => {
    if (score <= 30) return 'text-green-400';
    if (score <= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskLevelBadge = (score) => {
    if (score <= 30) return { text: 'Low', class: 'risk-badge-low' };
    if (score <= 60) return { text: 'Medium', class: 'risk-badge-medium' };
    return { text: 'High', class: 'risk-badge-high' };
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'LOGIN_FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'MFA_REQUIRED':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'OTP_VERIFIED':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'USER_REGISTERED':
        return <Activity className="w-5 h-5 text-purple-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-lg mr-4">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white" data-testid="dashboard-title">
                Security Dashboard
              </h1>
              <p className="text-slate-400">Welcome back, {user.full_name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition duration-200"
            data-testid="logout-button"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-slate-400 text-sm mb-1">Total Attempts</p>
              <p className="text-3xl font-bold text-white" data-testid="stat-total-attempts">{stats.total_attempts}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-slate-400 text-sm mb-1">Successful Logins</p>
              <p className="text-3xl font-bold text-green-400" data-testid="stat-successful-logins">{stats.successful_logins}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-slate-400 text-sm mb-1">Failed Attempts</p>
              <p className="text-3xl font-bold text-red-400" data-testid="stat-failed-logins">{stats.failed_logins}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="text-slate-400 text-sm mb-1">MFA Required</p>
              <p className="text-3xl font-bold text-yellow-400" data-testid="stat-mfa-required">{stats.mfa_required}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-slate-400 text-sm mb-1">Avg Risk Score</p>
              <p className={`text-3xl font-bold ${getRiskLevelColor(stats.avg_risk_score)}`} data-testid="stat-avg-risk">
                {stats.avg_risk_score}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition duration-200 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
            }`}
            data-testid="tab-overview"
          >
            Login Attempts
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 rounded-lg font-medium transition duration-200 ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
            }`}
            data-testid="tab-security-logs"
          >
            Security Logs
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Recent Login Attempts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                    <th className="text-left p-4 text-slate-300 font-medium">Risk Score</th>
                    <th className="text-left p-4 text-slate-300 font-medium">IP Address</th>
                    <th className="text-left p-4 text-slate-300 font-medium">Device</th>
                    <th className="text-left p-4 text-slate-300 font-medium">MFA</th>
                    <th className="text-left p-4 text-slate-300 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loginAttempts.map((attempt) => {
                    const riskBadge = getRiskLevelBadge(attempt.risk_score);
                    return (
                      <tr key={attempt.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="p-4">
                          {attempt.success ? (
                            <span className="flex items-center text-green-400">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Success
                            </span>
                          ) : (
                            <span className="flex items-center text-red-400">
                              <XCircle className="w-4 h-4 mr-2" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskBadge.class}`}>
                            {attempt.risk_score} - {riskBadge.text}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">{attempt.ip_address}</td>
                        <td className="p-4">
                          <span className="flex items-center text-slate-300">
                            <Fingerprint className="w-4 h-4 mr-2 text-slate-400" />
                            {attempt.device_info}
                          </span>
                        </td>
                        <td className="p-4">
                          {attempt.mfa_required ? (
                            <span className="text-yellow-400">Required</span>
                          ) : (
                            <span className="text-slate-400">Not Required</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 text-sm">
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
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Security Activity Log</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {logs.map((log) => {
                const riskBadge = getRiskLevelBadge(log.risk_score);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition duration-200"
                  >
                    <div className="mt-1">{getActionIcon(log.action)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-white font-medium">
                            {log.action.replace(/_/g, ' ')}
                          </h3>
                          <p className="text-slate-400 text-sm mt-1">{log.details}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${riskBadge.class}`}>
                          Risk: {log.risk_score}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-400 text-sm">
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {log.ip_address}
                        </span>
                        <span className="flex items-center">
                          <Fingerprint className="w-4 h-4 mr-1" />
                          {log.device_info}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
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
        <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-400" />
            How Risk-Based Authentication Works
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-green-400 font-semibold mb-2">Low Risk (0-30)</h4>
              <p className="text-slate-300 text-sm">
                Known device, familiar location, normal access time. Login without MFA.
              </p>
            </div>
            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">Medium Risk (31-60)</h4>
              <p className="text-slate-300 text-sm">
                Some unusual factors detected. May require MFA based on threshold.
              </p>
            </div>
            <div>
              <h4 className="text-red-400 font-semibold mb-2">High Risk (61-100)</h4>
              <p className="text-slate-300 text-sm">
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
