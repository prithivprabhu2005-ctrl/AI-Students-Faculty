import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/audit/logs');
      setLogs(data.logs || []);
    } catch (err) {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) return <div className="full-page-loader"><Spinner /></div>;

  const filtered = logs.filter(l => !filterAction || l.action === filterAction);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>📋 System Audit Logs</h1>
          <p style={{ color: 'var(--text-muted)' }}>Trace security, data modifications, logins, and system activities.</p>
        </div>

        <select className="filter-select" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">All Actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="STUDENT_ADDED">STUDENT_ADDED</option>
          <option value="STUDENT_UPDATED">STUDENT_UPDATED</option>
          <option value="SUBJECT_ADDED">SUBJECT_ADDED</option>
          <option value="ATTENDANCE_UPDATED">ATTENDANCE_UPDATED</option>
          <option value="ASSIGNMENT_UPDATED">ASSIGNMENT_UPDATED</option>
          <option value="REPORT_GENERATED">REPORT_GENERATED</option>
          <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
        </select>
      </div>

      {error && <div style={alertStyle('error')}>{error}</div>}

      <div style={cardStyle}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No audit logs recorded.</td></tr>
              ) : filtered.map(l => (
                <tr key={l._id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ fontWeight: 600 }}>{l.userName}</td>
                  <td><span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{l.role}</span></td>
                  <td><span className={`badge ${badgeForAction(l.action)}`}>{l.action}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{l.ipAddress || '127.0.0.1'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{l.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const badgeForAction = (a) => {
  if (a.includes('ADDED') || a.includes('RESTORED')) return 'badge-success';
  if (a.includes('DELETED')) return 'badge-danger';
  if (a.includes('LOGIN') || a.includes('UPDATED')) return 'badge-primary';
  return 'badge-warning';
};

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
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

export default AuditLogs;
