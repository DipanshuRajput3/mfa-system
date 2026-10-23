import { useState, useCallback } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from '@/components/Register';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import OTPVerification from '@/components/OTPVerification';

// Read the saved session synchronously so a refresh on /dashboard doesn't bounce to /login
const loadSavedUser = () => {
  try {
    const token = localStorage.getItem('session_token');
    const savedUser = localStorage.getItem('user');
    return token && savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
};

function App() {
  const [user, setUser] = useState(loadSavedUser);
  const isAuthenticated = Boolean(user);

  const handleLogin = (userData, token) => {
    localStorage.setItem('session_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <div className="App ui-page">
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/verify-otp" element={<OTPVerification onLogin={handleLogin} />} />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
