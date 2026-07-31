import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const NotificationsView = ({ userRole }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Announcement Composer Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('Faculty Announcement');
  const [recipientRole, setRecipientRole] = useState('all');
  const [recipientDepartment, setRecipientDepartment] = useState('all');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark a notification as read
  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Send announcement
  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return setError('Title and message are required.');
    }

    try {
      setSending(true);
      setError('');
      await api.post('/notifications/send', {
        title: title.trim(),
        message: message.trim(),
        type,
        recipientRole,
        recipientDepartment
      });

      setSuccess('📢 Announcement broadcasted successfully!');
      setShowModal(false);
      setTitle('');
      setMessage('');
      fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || 'Error sending announcement.');
    } finally {
      setSending(false);
    }
  };

  // Trigger automated low attendance alerts (Admin only)
  const handleTriggerAutoAlerts = async () => {
    try {
      setLoading(true);
      const { data } = await api.post('/notifications/auto-alerts');
      setSuccess(`⚡ ${data.message}`);
      fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || 'Error triggering automated alerts.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="full-page-loader"><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>🔔 Notifications &amp; Announcements</h1>
          <p style={{ color: 'var(--text-muted)' }}>Stay updated with class reminders, low attendance alerts, and faculty announcements.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {userRole === 'admin' && (
            <button className="btn btn-secondary" onClick={handleTriggerAutoAlerts}>
              ⚡ Run Auto Risk Scan
            </button>
          )}
          {(userRole === 'admin' || userRole === 'faculty') && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              📢 Send Announcement
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && <div style={alertStyle('error')}>{error}</div>}
      {success && <div style={alertStyle('success')}>{success}</div>}

      {/* Inbox Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={cardTitleStyle}>
            Inbox Notifications
            {unreadCount > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: '0.75rem' }}>
                {unreadCount} Unread
              </span>
            )}
          </h3>
        </div>

        {notifications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            No notifications in your inbox.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {notifications.map(n => (
              <div
                key={n._id}
                style={{
                  background: n.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(59,130,246,0.08)',
                  border: n.isRead ? '1px solid var(--border-color)' : '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
                  <div style={{ fontSize: '1.5rem' }}>
                    {n.type === 'Low Attendance Warning' ? '⚠️' : n.type === 'Poor Performance Alert' ? '🔴' : n.type === 'Assignment Due Reminder' ? '📝' : '📢'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{n.title}</span>
                      <span className={`badge ${badgeForType(n.type)}`}>{n.type}</span>
                    </div>
                    <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      From: <strong>{n.sender?.name || 'System Admin'}</strong> ({n.sender?.role || 'Admin'}) • {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n._id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcement Composer Modal */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.3rem', fontWeight: 700 }}>
                📢 Send Announcement
              </h2>
              <button style={closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSendAnnouncement}>
              <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Title *</label>
                  <input
                    className="form-control"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Mid-Term Assignment Due Date Extended"
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Message *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type message content..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Notification Type</label>
                  <select className="form-control" value={type} onChange={e => setType(e.target.value)}>
                    <option value="Faculty Announcement">Faculty Announcement</option>
                    <option value="Assignment Due Reminder">Assignment Due Reminder</option>
                    <option value="Low Attendance Warning">Low Attendance Warning</option>
                    <option value="Poor Performance Alert">Poor Performance Alert</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Audience (Role)</label>
                  <select className="form-control" value={recipientRole} onChange={e => setRecipientRole(e.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="student">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                  </select>
                </div>

                {userRole === 'admin' && (
                  <div className="form-group">
                    <label>Target Department</label>
                    <select className="form-control" value={recipientDepartment} onChange={e => setRecipientDepartment(e.target.value)}>
                      <option value="all">All Departments</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={sending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? 'Sending…' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Shared Helpers & Styles ──
const badgeForType = (t) => {
  if (t === 'Low Attendance Warning' || t === 'Poor Performance Alert') return 'badge-danger';
  if (t === 'Assignment Due Reminder') return 'badge-warning';
  return 'badge-primary';
};

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
  fontWeight: 700
};

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)'
};

const modalStyle = {
  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
  borderRadius: '16px', padding: '2rem', width: '100%',
  maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'
};

const closeBtn = {
  background: 'none', border: 'none', color: 'var(--text-muted)',
  cursor: 'pointer', fontSize: '1.2rem'
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

export default NotificationsView;
