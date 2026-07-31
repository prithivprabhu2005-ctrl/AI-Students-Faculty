import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const ApproveStudents = () => {
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchPendingStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users', {
        params: { role: 'student' }
      });
      const allStudents = response.data.users || [];
      const pending = allStudents.filter(
        (u) => u.status === 'pending'
      );
      setPendingStudents(pending);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch pending student requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingStudents();
  }, []);

  const handleApprove = async (user) => {
    try {
      setActionLoading(user._id);
      await api.patch(`/users/${user._id}/status`, {
        status: 'active',
        isActive: true
      });
      setMessage(`Successfully approved ${user.name}'s account.`);
      fetchPendingStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve student account.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (user) => {
    if (!window.confirm(`Are you sure you want to reject ${user.name}'s registration?`)) {
      return;
    }

    try {
      setActionLoading(user._id);
      await api.patch(`/users/${user._id}/status`, {
        status: 'rejected',
        isActive: false
      });
      setMessage(`Rejected registration for ${user.name}.`);
      fetchPendingStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject student account.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="dashboard-section-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2>⏳ Pending Student Approvals</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Review self-registered student accounts and grant activation status to allow login access.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchPendingStudents} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
      {message && <div style={{ color: 'var(--success)', marginBottom: '1rem', fontWeight: 600 }}>{message}</div>}

      {loading ? (
        <Spinner />
      ) : pendingStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
          <h3>No Pending Student Requests</h3>
          <p>All student registrations have been reviewed and approved.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email Address</th>
                <th>Register Number</th>
                <th>Department</th>
                <th>Status</th>
                <th>Registration Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingStudents.map((student) => (
                <tr key={student._id}>
                  <td style={{ fontWeight: 600 }}>{student.name}</td>
                  <td>{student.email}</td>
                  <td>
                    <span className="badge badge-primary">{student.registerNumber || 'N/A'}</span>
                  </td>
                  <td>{student.department || 'N/A'}</td>
                  <td>
                    <span className="badge badge-warning">Pending Approval</span>
                  </td>
                  <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
                        disabled={actionLoading === student._id}
                        onClick={() => handleApprove(student)}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', background: '#fee2e2', color: '#dc2626' }}
                        disabled={actionLoading === student._id}
                        onClick={() => handleReject(student)}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApproveStudents;
