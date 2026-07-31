import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';
import { ProgressRing, BarChart, LineChart } from './Charts';

const StudentPerformanceAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudentAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { data: resData } = await api.get('/analytics/student');
      setData(resData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load personal student analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentAnalytics();
  }, [fetchStudentAnalytics]);

  if (loading) return <div className="full-page-loader"><Spinner /></div>;
  if (error) return <div style={alertStyle('error')}>{error}</div>;

  const {
    student = {},
    attendancePercentage = 0,
    assignmentAverage = 0,
    totalClasses = 0,
    attendedClasses = 0,
    totalAssignments = 0,
    subjectBreakdown = [],
    strengths = [],
    weakSubjects = [],
    departmentAverageCgpa = 0,
    departmentAveragePercentage = 0
  } = data || {};

  // Subject marks bar chart data
  const subjectChartData = subjectBreakdown.map(s => ({
    label: s.name,
    value: s.total,
    color: s.total >= 80 ? '#10b981' : s.total >= 60 ? '#3b82f6' : s.total >= 50 ? '#f59e0b' : '#ef4444'
  }));

  // Comparison trend chart data
  const comparisonData = [
    { label: 'Your CGPA', value: student.cgpa || 0 },
    { label: 'Dept Avg CGPA', value: departmentAverageCgpa || 0 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>🎯 My Academic Performance Analytics</h1>
        <p style={{ color: 'var(--text-muted)' }}>Detailed breakdown of CGPA, subject scores, attendance, rank, strengths, and recommendations.</p>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card success">
          <div className="metric-label">Cumulative CGPA</div>
          <div className="metric-value">{student.cgpa}</div>
          <div className="metric-footer">College Rank: <span>#{student.rank}</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Overall Percentage</div>
          <div className="metric-value">{student.percentage}%</div>
          <div className="metric-footer">Department: <span>{student.department}</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Attendance Rate</div>
          <div className="metric-value">{attendancePercentage}%</div>
          <div className="metric-footer"><span>{attendedClasses}</span> of {totalClasses} classes</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Assignment Average</div>
          <div className="metric-value">{assignmentAverage}%</div>
          <div className="metric-footer"><span>{totalAssignments}</span> assignments completed</div>
        </div>
        <div className={`metric-card ${student.arrears === 0 ? 'success' : 'danger'}`}>
          <div className="metric-label">Arrear Count</div>
          <div className="metric-value">{student.arrears}</div>
          <div className="metric-footer">Result: <span>{student.result}</span></div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <BarChart data={subjectChartData} xKey="label" yKey="value" title="📘 Subject-wise Marks Breakdown (Total / 100)" height={220} />
        </div>
        <div style={cardStyle}>
          <BarChart data={comparisonData} xKey="label" yKey="value" title="📈 CGPA Comparison (You vs Dept Avg)" height={220} barColor="#10b981" />
        </div>
      </div>

      {/* Strengths & Weak Subjects Recommendation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={strengthCardStyle}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', color: '#34d399', marginBottom: '0.75rem' }}>
            🌟 Academic Strengths
          </h3>
          {strengths.length > 0 ? (
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
              {strengths.map((sub, i) => (
                <li key={i}>
                  <strong>{sub}</strong> — Excellent mastery and high score. Keep up the great performance!
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Keep striving across all subjects to build your top strengths.</p>
          )}
        </div>

        <div style={weaknessCardStyle}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', color: '#f87171', marginBottom: '0.75rem' }}>
            ⚠️ Priority Improvement Areas
          </h3>
          {weakSubjects.length > 0 ? (
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
              {weakSubjects.map((sub, i) => (
                <li key={i}>
                  <strong>{sub}</strong> — Additional practice and faculty guidance recommended.
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#34d399' }}>🎉 Great job! No failing or weak subjects identified.</p>
          )}
        </div>
      </div>

      {/* Subject Marks & Grades Table */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>📋 Detailed Subject Marks &amp; Grades</h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Internal (40)</th>
                <th>External (60)</th>
                <th>Total (100)</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subjectBreakdown.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.internal}</td>
                  <td>{s.external}</td>
                  <td style={{ fontWeight: 700 }}>{s.total}</td>
                  <td><span className="badge badge-primary">{s.grade}</span></td>
                  <td>
                    <span className={`badge ${s.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                      {s.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

const strengthCardStyle = {
  background: 'rgba(16,185,129,0.08)',
  border: '1px solid rgba(16,185,129,0.3)',
  borderRadius: '16px',
  padding: '1.5rem'
};

const weaknessCardStyle = {
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: '16px',
  padding: '1.5rem'
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

export default StudentPerformanceAnalytics;
