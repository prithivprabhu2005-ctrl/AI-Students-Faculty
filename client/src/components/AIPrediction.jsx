import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';
import { DonutChart, BarChart } from './Charts';

const AIPrediction = ({ userRole }) => {
  const [data, setData] = useState(null);
  const [personalPred, setPersonalPred] = useState(null);
  const [facultyInsights, setFacultyInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (userRole === 'student') {
        const { data: res } = await api.get('/prediction/student');
        setPersonalPred(res.prediction);
      } else {
        const url = filterDept ? `/prediction/all?department=${filterDept}` : '/prediction/all';
        const { data: res } = await api.get(url);
        setData(res);

        if (userRole === 'faculty') {
          const { data: fRes } = await api.get('/prediction/faculty-insights');
          setFacultyInsights(fRes);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load AI predictions.');
    } finally {
      setLoading(false);
    }
  }, [userRole, filterDept]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="full-page-loader"><Spinner /></div>;
  if (error) return <div style={alertStyle('error')}>{error}</div>;

  // ── 1. Student Personal View ──
  if (userRole === 'student' && personalPred) {
    const p = personalPred;
    const isHigh = p.riskLevel === 'High';
    const isMed = p.riskLevel === 'Medium';
    const riskBadgeClass = isHigh ? 'badge-danger' : isMed ? 'badge-warning' : 'badge-success';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="dashboard-header">
          <h1>🤖 My AI Performance Prediction</h1>
          <p style={{ color: 'var(--text-muted)' }}>AI-driven prediction of your final semester results, expected CGPA, and personalized recommendations.</p>
        </div>

        {/* Primary Prediction Cards Grid */}
        <div className="metrics-grid">
          <div className="metric-card success">
            <div className="metric-label">Expected Final CGPA</div>
            <div className="metric-value">{p.expectedCgpa}</div>
            <div className="metric-footer">Current CGPA: <span>{p.currentCgpa}</span></div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Pass Probability</div>
            <div className="metric-value">{p.passProbability}%</div>
            <div className="metric-footer">Predicted Result: <span>{p.predictedResult}</span></div>
          </div>

          <div className={`metric-card ${isHigh ? 'danger' : isMed ? 'warning' : 'success'}`}>
            <div className="metric-label">Risk Level</div>
            <div className="metric-value" style={{ textTransform: 'uppercase' }}>{p.riskLevel}</div>
            <div className="metric-footer">Subject Arrears: <span>{p.arrears}</span></div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Attendance Rate</div>
            <div className="metric-value">{p.attendancePercentage}%</div>
            <div className="metric-footer">Assignment Avg: <span>{p.assignmentAverage}%</span></div>
          </div>
        </div>

        {/* AI Recommendations Card */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>💡 AI Recommendations &amp; Action Plan</h3>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {p.recommendations.map((rec, i) => (
              <li key={i} style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ── 2. Admin & Faculty Prediction View ──
  const summary = data?.summary || {};
  const predictions = data?.predictions || [];
  const studentsAtRisk = data?.studentsAtRisk || [];

  const riskData = [
    { label: 'Low Risk', value: summary.lowRiskCount || 0, color: '#10b981' },
    { label: 'Medium Risk', value: summary.mediumRiskCount || 0, color: '#f59e0b' },
    { label: 'High Risk', value: summary.highRiskCount || 0, color: '#ef4444' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>🤖 AI Performance Prediction &amp; Early Warning</h1>
          <p style={{ color: 'var(--text-muted)' }}>Identify students at academic risk, predict expected CGPA outcomes, and review faculty class insights.</p>
        </div>

        {userRole === 'admin' && (
          <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Evaluated</div>
          <div className="metric-value">{summary.totalStudents}</div>
          <div className="metric-footer">students analyzed</div>
        </div>
        <div className="metric-card success">
          <div className="metric-label">Low Risk Students</div>
          <div className="metric-value">{summary.lowRiskCount}</div>
          <div className="metric-footer">on track to pass</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-label">Medium Risk Students</div>
          <div className="metric-value">{summary.mediumRiskCount}</div>
          <div className="metric-footer">need moderate monitoring</div>
        </div>
        <div className="metric-card danger">
          <div className="metric-label">High Risk Students</div>
          <div className="metric-value">{summary.highRiskCount}</div>
          <div className="metric-footer">priority intervention needed</div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <DonutChart data={riskData} title="🎯 Student Risk Level Distribution" size={190} />
        </div>
        {facultyInsights && (
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>👨‍🏫 Faculty Class Overview ({facultyInsights.department})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div style={statBoxStyle}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Class Avg Attendance</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{facultyInsights.classAvgAttendance}%</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Assignment Completion</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{facultyInsights.classAssignmentCompletion}%</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Students At Risk Priority Table */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>⚠️ Priority Intervention: Students at Risk</h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Reg No</th>
                <th>Dept</th>
                <th>Current CGPA</th>
                <th>Expected CGPA</th>
                <th>Pass Prob</th>
                <th>Risk Level</th>
                <th>AI Action Plan</th>
              </tr>
            </thead>
            <tbody>
              {studentsAtRisk.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>🎉 No students currently identified at medium or high risk!</td></tr>
              ) : studentsAtRisk.map(p => (
                <tr key={p.studentId}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="badge badge-primary">{p.registerNumber}</span></td>
                  <td>{p.department}</td>
                  <td>{p.currentCgpa}</td>
                  <td style={{ fontWeight: 700 }}>{p.expectedCgpa}</td>
                  <td>{p.passProbability}%</td>
                  <td>
                    <span className={`badge ${p.riskLevel === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                      {p.riskLevel} Risk
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {p.recommendations[0] || 'Monitor progress'}
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

const statBoxStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '1rem'
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

export default AIPrediction;
