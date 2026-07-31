import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const ActivityDashboard = () => {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/audit/activity');
      setFeed(data);
    } catch (err) {
      setError('Failed to load activity feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (loading) return <div className="full-page-loader"><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header">
        <h1>⚡ Real-time Activity Feed</h1>
        <p style={{ color: 'var(--text-muted)' }}>Monitor recent logins, student record updates, attendance entries, and reports.</p>
      </div>

      {error && <div style={alertStyle('error')}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Logins */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🔑 Recent User Logins</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {feed?.recentLogins?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent login records.</p>
            ) : feed?.recentLogins?.map(l => (
              <div key={l._id} style={itemStyle}>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>{l.userName}</strong> ({l.role})
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IP: {l.ipAddress || '127.0.0.1'}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(l.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Student Updates */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🎓 Recent Student Updates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {feed?.recentStudentUpdates?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent student updates.</p>
            ) : feed?.recentStudentUpdates?.map(l => (
              <div key={l._id} style={itemStyle}>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>{l.userName}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.details}</div>
                </div>
                <span className="badge badge-primary">{l.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Attendance */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>📅 Recent Attendance Marking</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {feed?.recentAttendanceUpdates?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent attendance entries.</p>
            ) : feed?.recentAttendanceUpdates?.map(l => (
              <div key={l._id} style={itemStyle}>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>{l.userName}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.details}</div>
                </div>
                <span className="badge badge-success">Attendance</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>📄 Recent Generated Reports</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {feed?.recentReports?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent reports generated.</p>
            ) : feed?.recentReports?.map(l => (
              <div key={l._id} style={itemStyle}>
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>{l.userName}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.details}</div>
                </div>
                <span className="badge badge-warning">Report</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
  fontWeight: 700,
  marginBottom: '1rem'
};

const itemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.6rem 0.85rem',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px'
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

export default ActivityDashboard;
