import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Register.css';
import loginImage from "../../assets/ms_logo.png"
const Register: React.FC = () => {
  const { register, microsoftLogin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Validation
      if (!email || !password || !confirmPassword) {
        const msg = 'All fields are required';
        setError(msg);
        toast.error(msg);
        return;
      }

      if (password !== confirmPassword) {
        const msg = 'Password confirmation does not match';
        setError(msg);
        toast.error(msg);
        return;
      }

      if (password.length < 6) {
        const msg = 'Password must be at least 6 characters';
        setError(msg);
        toast.error(msg);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const msg = 'Invalid email address';
        setError(msg);
        toast.error(msg);
        return;
      }

      await register(email, password);
      toast.success('Registration successful! Redirecting to Dashboard...');
      
      // AuthContext sẽ tự động chuyển hướng thông qua ProtectedRoute
      
    } catch (err: any) {
      const msg = err?.message || 'Registration failed';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleMicrosoftLogin = async () => {
    setError(null);
    try {
      await microsoftLogin();
      toast.success('Microsoft registration successful! Redirecting to Dashboard...');
      // AuthContext sẽ tự động chuyển hướng thông qua ProtectedRoute
    } catch (err: any) {
      const msg = err?.message || 'Microsoft registration failed';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="register-container">
      <div className="register-main">
        {/* Left Section - Visual Graphic */}
        <div className="register-left">
          <div className="visual-graphic">
            <div className="network-nodes" />
          </div>
        </div>

        {/* Right Section - Register Form */}
        <div className="register-right">
          <form onSubmit={handleSubmit} className="register-form">
            <h1 className="register-title">Create New Account</h1>
            <p className="register-subtitle">Register to use Automation Test Execution.</p>

            {/* Errors are displayed via toast */}

            <div className="form-group">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
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
                  autoComplete="new-password"
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

            <div className="form-group">
              <label>Confirm Password <span className="required">*</span></label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  aria-label="toggle confirm password"
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className="register-button" type="submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Register'}
            </button>

            <div className="separator">
              <span />
              <span>OR</span>
            </div>

            <button className="microsoft-login-button" onClick={handleMicrosoftLogin} type="button" disabled={isLoading}>
              <img src={loginImage} alt="Microsoft" className="microsoft-logo-img" />
              Register with Microsoft
            </button>

            <div className="login-link">
              <span>Already have an account?</span>
              <button type="button" className="login-button-register" onClick={handleBackToLogin} disabled={isLoading}>
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
