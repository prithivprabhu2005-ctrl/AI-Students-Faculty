import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './login.css';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      return setErrorMessage('Please enter both email and password.');
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const user = await login({ email: email.trim(), password });
      const from = location.state?.from;

      if (from) {
        navigate(from, { replace: true });
        return;
      }

      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'faculty') {
        navigate('/faculty/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-section">
          <div className="brand-icon">🎓</div>
          <h1>Student Academic System</h1>
          <p>Sign in to access your dashboard and NLQ Chatbot.</p>
        </div>

        {errorMessage && <div className="auth-alert error">{errorMessage}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <label className="input-group">
            <span>Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </label>

          <label className="input-group">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer-link">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
