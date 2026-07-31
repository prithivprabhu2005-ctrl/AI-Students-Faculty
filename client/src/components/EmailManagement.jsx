import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const EMAIL_TYPES = [
  'DailyDigest',
  'WeeklyDigest',
  'MonthlyReport',
  'Welcome',
  'AttendanceAlert',
  'TimetableNotification',
  'AssignmentNotification',
  'MarksUpdated',
  'PortfolioNotification',
  'EventNotification',
  'LeaveNotification'
];

const EmailManagement = () => {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({ totalEmailsSent: 0, totalFailed: 0, successRate: '100%' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Preview Modal
  const [previewLog, setPreviewLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (searchQuery) params.search = searchQuery;

      const { data } = await api.get('/emails/logs', { params });
      setLogs(data.logs || []);
      setMetrics(data.metrics || { totalEmailsSent: 0, totalFailed: 0, successRate: '100%' });
      setPagination(data.pagination || { total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch email logs.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResend = async (id) => {
    try {
      setActionLoading(true);
      setMessage('');
      await api.post(`/emails/resend/${id}`);
      setMessage('Email resent successfully!');
      fetchLogs();
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend email.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerDailyDigest = async () => {
    if (!window.confirm('Dispatch Daily Student Digest to all enrolled students now?')) return;
    try {
      setActionLoading(true);
      setMessage('');
      await api.post('/emails/trigger-digest');
      setMessage('Daily Student Digest triggered and dispatched to all students!');
      fetchLogs();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to trigger digest dispatch.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreview = async (id) => {
    try {
      const { data } = await api.get(`/emails/preview/${id}`);
      setPreviewLog(data.log);
    } catch (err) {
      setError('Could not fetch email preview.');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Sent') return <span className="badge badge-success">Sent</span>;
    if (status === 'Failed') return <span className="badge badge-danger">Failed</span>;
    return <span className="badge badge-warning">{status}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📧</span> Email &amp; Daily Student Digest Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Monitor automated email delivery, daily 8 AM student digests, system notifications, and resend failed dispatches.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleTriggerDailyDigest} disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🚀 Trigger Daily Digest Now
        </button>
      </div>

      {message && <div className="auth-alert success">{message}</div>}
      {error && <div className="auth-alert error">{error}</div>}

      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={metricCardStyle}>
          <div style={{ fontSize: '1.5rem' }}>📬</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{metrics.totalEmailsSent}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Emails Delivered</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ fontSize: '1.5rem' }}>⚠️</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>{metrics.totalFailed}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivery Failures</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ fontSize: '1.5rem' }}>📈</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{metrics.successRate}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivery Success Rate</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ fontSize: '1.5rem' }}>⏰</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>8:00 AM Daily</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automated Schedule</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="dashboard-section-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <label style={filterLabelStyle}>Status Filter:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-input" style={{ width: '100%' }}>
              <option value="">All Statuses</option>
              <option value="Sent">Sent</option>
              <option value="Failed">Failed</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Email Type:</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="select-input" style={{ width: '100%' }}>
              <option value="">All Email Types</option>
              {EMAIL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Search Recipient / Subject:</label>
            <input
              type="text"
              placeholder="Search email or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="dashboard-section-card">
        <h2>📋 System Email Dispatch Logs ({pagination.total} Records)</h2>
        <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

        {loading ? (
          <Spinner />
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Sent Date &amp; Time</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No email log records found matching filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.recipient}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.studentName}</div>
                      </td>
                      <td style={{ maxWidth: '240px', wordBreak: 'break-word', fontWeight: 500 }}>{item.subject}</td>
                      <td><span className="badge badge-primary">{item.type}</span></td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(item.sentTime).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button onClick={() => handlePreview(item._id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>
                            👁️ Preview
                          </button>
                          {item.status === 'Failed' && (
                            <button onClick={() => handleResend(item._id)} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>
                              🔄 Resend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {previewLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="dashboard-section-card" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>📧 Email Preview</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To: {previewLog.recipient} | Subject: {previewLog.subject}</div>
              </div>
              <button onClick={() => setPreviewLog(null)} className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem' }}>✖ Close</button>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1rem', color: '#000000', maxHeight: '600px', overflowY: 'auto' }}>
              <div dangerouslySetInnerHTML={{ __html: previewLog.htmlContent }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const filterLabelStyle = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '0.25rem',
  display: 'block'
};

const metricCardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '1rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem'
};

export default EmailManagement;
