import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/profile');
      setProfile(data.user);
      setName(data.user?.name || '');
      if (data.studentDetails) {
        setStudentDetails(data.studentDetails);
        setPhone(data.studentDetails.phone || '');
        setAddress(data.studentDetails.address || '');
      }
    } catch (err) {
      setError('Failed to load user profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const { data } = await api.put('/profile/update', { name, phone, address });
      setSuccess('Profile details updated successfully!');
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError('New password and confirm password do not match.');
    }

    try {
      setPwdSaving(true);
      setError('');
      const { data } = await api.put('/profile/password', { currentPassword, newPassword });
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error changing password.');
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) return <div className="full-page-loader"><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>👤 User Profile Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your personal details, credentials, and account settings.</p>
      </div>

      {/* Alerts */}
      {error && <div style={alertStyle('error')}>{error}</div>}
      {success && <div style={alertStyle('success')}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        {/* User Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 700 }}>{profile?.name}</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{profile?.email}</div>
              <span className="badge badge-primary" style={{ marginTop: '0.5rem', textTransform: 'capitalize' }}>
                Role: {profile?.role}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
            <div>Department: <strong style={{ color: 'var(--text-main)' }}>{profile?.department || 'N/A'}</strong></div>
            {profile?.staffId && <div>Staff ID: <strong style={{ color: 'var(--text-main)' }}>{profile.staffId}</strong></div>}
            {profile?.registerNumber && <div>Register No: <strong style={{ color: 'var(--text-main)' }}>{profile.registerNumber}</strong></div>}
            <div>Account Status: <span className="badge badge-success">{profile?.isActive ? 'Active' : 'Inactive'}</span></div>
          </div>
        </div>

        {/* Edit Form & Password Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Edit Profile */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>✏️ Edit Profile Details</h3>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                {studentDetails && (
                  <>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Address</label>
                      <input className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Updating…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🔒 Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Current Password *</label>
                  <input type="password" className="form-control" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>New Password *</label>
                  <input type="password" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input type="password" className="form-control" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
                  {pwdSaving ? 'Changing…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Shared Styles ──
const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
};

const cardTitleStyle = {
  fontFamily: 'var(--font-title)',
  fontSize: '1.1rem',
  fontWeight: 700,
  marginBottom: '1rem'
};

const alertStyle = (type) => ({
  padding: '0.85rem 1.2rem',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontWeight: 500,
  background: type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
  color: type === 'error' ? '#f87171' : '#34d399',
  border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
});

export default Profile;
