import { useState, useEffect } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

// ──────────────────────────────────────────────────────────────
// StudentAcademicView Component
// Student role: View own attendance & assignment marks (read-only)
// ──────────────────────────────────────────────────────────────

const StudentAcademicView = () => {
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'assignments'

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [aRes, assignRes] = await Promise.all([
          api.get('/academic/attendance'),
          api.get('/academic/assignments')
        ]);
        setAttendance(aRes.data.attendance || []);
        setAssignments(assignRes.data.assignments || []);
      } catch (err) {
        setError('Failed to load your academic data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div>;

  // ── Attendance calculations ──
  const totalClasses = attendance.length;
  const attended = attendance.filter(a => a.status === 'Present').length;
  const overallPct = totalClasses > 0 ? ((attended / totalClasses) * 100).toFixed(1) : null;

  // Group by subject
  const subjectMap = {};
  attendance.forEach(a => {
    const key = a.subject?._id || a.subjectCode;
    if (!key) return;
    if (!subjectMap[key]) {
      subjectMap[key] = {
        name: a.subject?.subjectName || a.subjectCode || 'Unknown',
        code: a.subject?.subjectCode || a.subjectCode || '',
        total: 0,
        present: 0,
        records: []
      };
    }
    subjectMap[key].total++;
    if (a.status === 'Present') subjectMap[key].present++;
    subjectMap[key].records.push(a);
  });

  const subjectAttendance = Object.values(subjectMap);

  // ── Assignment calculations ──
  const totalAssignments = assignments.length;
  const totalScored = assignments.reduce((sum, a) => sum + (a.obtainedMarks || 0), 0);
  const totalMax = assignments.reduce((sum, a) => sum + (a.totalMarks || 0), 0);
  const avgPct = totalMax > 0 ? ((totalScored / totalMax) * 100).toFixed(1) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>🎓 My Academic Overview</h1>
        <p style={{ color: 'var(--text-muted)' }}>View your attendance and assignment marks.</p>
      </div>

      {error && <div style={alertStyle('error')}>{error}</div>}

      {/* Quick stats */}
      <div className="metrics-grid">
        <div className={`metric-card ${overallPct !== null ? (parseFloat(overallPct) >= 75 ? 'success' : parseFloat(overallPct) >= 60 ? 'warning' : 'danger') : ''}`}>
          <div className="metric-label">Overall Attendance</div>
          <div className="metric-value">{overallPct !== null ? `${overallPct}%` : '—'}</div>
          <div className="metric-footer">
            <span>{attended}</span> of {totalClasses} classes
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Subjects Attended</div>
          <div className="metric-value">{subjectAttendance.length}</div>
          <div className="metric-footer">across all subjects</div>
        </div>
        <div className={`metric-card ${avgPct !== null ? (parseFloat(avgPct) >= 75 ? 'success' : parseFloat(avgPct) >= 50 ? 'warning' : 'danger') : ''}`}>
          <div className="metric-label">Assignment Average</div>
          <div className="metric-value">{avgPct !== null ? `${avgPct}%` : '—'}</div>
          <div className="metric-footer">
            <span>{totalScored}</span> of {totalMax} marks scored
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Assignments</div>
          <div className="metric-value">{totalAssignments}</div>
          <div className="metric-footer">submitted &amp; evaluated</div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        <button
          onClick={() => setActiveTab('attendance')}
          style={tabBtn(activeTab === 'attendance')}
        >
          📅 My Attendance
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          style={tabBtn(activeTab === 'assignments')}
        >
          📝 My Assignment Marks
        </button>
      </div>

      {/* ── Attendance Tab ── */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Subject-wise summary cards */}
          {subjectAttendance.length > 0 ? (
            <>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', fontWeight: 600 }}>
                Subject-wise Attendance
              </h3>
              <div className="metrics-grid">
                {subjectAttendance.map((s, i) => {
                  const pct = s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : 0;
                  const color = parseFloat(pct) >= 75 ? 'success' : parseFloat(pct) >= 60 ? 'warning' : 'danger';
                  return (
                    <div key={i} className={`metric-card ${color}`}>
                      <div className="metric-label">{s.code || 'Subject'}</div>
                      <div className="metric-value">{pct}%</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.4 }}>
                        {s.name}
                      </div>
                      <div className="metric-footer">
                        <span>{s.present}</span> / {s.total} classes attended
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {/* Detailed attendance log */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Detailed Attendance Log</h3>
            {attendance.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                No attendance records found yet.
              </p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...attendance].sort((a, b) => new Date(b.date) - new Date(a.date)).map(a => (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 500 }}>{a.subject?.subjectName || 'Unknown'}</td>
                        <td><span className="badge badge-primary">{a.subject?.subjectCode || a.subjectCode || '—'}</span></td>
                        <td>{new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <span className={`badge ${a.status === 'Present' ? 'badge-success' : 'badge-danger'}`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Assignments Tab ── */}
      {activeTab === 'assignments' && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>My Assignment Marks</h3>
          {assignments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
              No assignment marks recorded yet.
            </p>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Assignment</th>
                    <th>Obtained / Total</th>
                    <th>Percentage</th>
                    <th>Remarks</th>
                    <th>Submission Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...assignments].sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate)).map(a => {
                    const pct = a.totalMarks ? ((a.obtainedMarks / a.totalMarks) * 100).toFixed(1) : '—';
                    return (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 500 }}>{a.subject?.subjectName || '—'}</td>
                        <td>{a.assignmentTitle}</td>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>{a.obtainedMarks}</strong>
                          <span style={{ color: 'var(--text-muted)' }}> / {a.totalMarks}</span>
                        </td>
                        <td>
                          <span className={`badge ${parseFloat(pct) >= 75 ? 'badge-success' : parseFloat(pct) >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                            {pct}%
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {a.remarks || <em>No remarks</em>}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {new Date(a.submissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Shared Styles ──
const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1.75rem',
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

const tabBtn = (active) => ({
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  padding: '0.6rem 1rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.2s',
  marginBottom: '-1px'
});

export default StudentAcademicView;
