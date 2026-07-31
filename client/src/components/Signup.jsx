import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './login.css';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [staffId, setStaffId] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Client-side validations
    if (!name.trim() || !email.trim() || !password) {
      return setErrorMessage('Name, email, and password are required.');
    }
    if (password.length < 6) {
      return setErrorMessage('Password must be at least 6 characters.');
    }
    if ((role === 'student' || role === 'faculty') && !department) {
      return setErrorMessage('Department is required.');
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        department: department || undefined,
        registerNumber: role === 'student' && registerNumber.trim() ? registerNumber.trim().toUpperCase() : undefined,
        staffId: role === 'faculty' ? staffId.trim().toUpperCase() : undefined
      };

      const response = await api.post('/auth/register', payload);
      setSuccessMessage(response.data.message || 'Registration submitted! Your account is pending administrator approval before you can log in.');

      setTimeout(() => {
        navigate('/login');
      }, 3500);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-section">
          <div className="brand-icon">🎓</div>
          <h1>Create Account</h1>
          <p>Student Account Portal. Admin can also manage accounts in Administration.</p>
        </div>

        {errorMessage && <div className="auth-alert error">{errorMessage}</div>}
        {successMessage && <div className="auth-alert success">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <label className="input-group">
            <span>Full Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </label>

          <label className="input-group">
            <span>Email Address *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@college.edu"
              required
            />
          </label>

          <label className="input-group">
            <span>Password *</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </label>

          <label className="input-group">
            <span>Department *</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              className="select-input"
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          {role === 'student' && (
            <label className="input-group">
              <span>Register Number (Optional)</span>
              <input
                type="text"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                placeholder="e.g. 21CS045 (Auto-generated if empty)"
                style={{ textTransform: 'uppercase' }}
              />
            </label>
          )}

          {role === 'faculty' && (
            <label className="input-group">
              <span>Staff ID *</span>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. FAC102"
                required
                style={{ textTransform: 'uppercase' }}
              />
            </label>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Creating Account…' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
