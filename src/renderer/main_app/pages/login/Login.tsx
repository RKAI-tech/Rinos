import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const { login, microsoftLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!email || !password) {
        const msg = 'Email và mật khẩu là bắt buộc';
        setError(msg);
        toast.error(msg);
        return;
      }
      await login(email, password);
    } catch (err: any) {
      const msg = err?.message || 'Đăng nhập thất bại';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError(null);
    try {
      await microsoftLogin();
    } catch (err: any) {
      const msg = err?.message || 'Microsoft login thất bại';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="login-container">
      <div className="login-main">
        {/* Left Section - Visual Graphic */}
        <div className="login-left">
          <div className="visual-graphic">
            <div className="network-nodes" />
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="login-right">
          {/* Optional header / language selector placeholder */}
          

          <form onSubmit={handleSubmit} className="login-form">
            <h1 className="login-title">Automation Test Execution</h1>
            <p className="login-subtitle">Enter your credentials to access the tool.</p>

            {/* Errors được hiển thị qua toast */}

            <div className="form-group">
              <label>Email <span className="required">*</span></label>
              <input
                type="text"
                placeholder="demo@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label>Password <span className="required">*</span></label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label="toggle password"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className="login-button" type="submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Login'}
            </button>

            <div className="separator">
              <span />
              <span>OR</span>
            </div>

            <button className="microsoft-login-button" onClick={handleMicrosoftLogin} type="button" disabled={isLoading}>
              <img src="/main_app/assets/ms_logo.png" alt="Microsoft" className="microsoft-logo-img" />
              Login with Microsoft
            </button>

            <div className="forgot-password">
              <button type="button" className="forgot-password-link" disabled={isLoading}>Forgot Password?</button>
            </div>
            <div className="register-link">
              <span>Don't have an account?</span>
              <button type="button" className="register-button" disabled={isLoading}>Register</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;


