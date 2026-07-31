import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';
import { BarChart, DonutChart, LineChart } from './Charts';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { data: resData } = await api.get('/analytics/admin');
      setData(resData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) return <div className="full-page-loader"><Spinner /></div>;
  if (error) return <div style={alertStyle('error')}>{error}</div>;

  const { summary = {}, departmentStats = [], semesterStats = [], subjectStats = [], top10 = [], bottom10 = [] } = data || {};

  // Chart data formatting
  const deptChartData = departmentStats.map(d => ({
    label: d.department,
    value: d.totalStudents,
    color: '#3b82f6'
  }));

  const passFailData = [
    { label: 'Pass Rate', value: summary.overallPassPercentage || 0, color: '#10b981' },
    { label: 'Fail Rate', value: summary.overallFailPercentage || 0, color: '#ef4444' }
  ];

  const semChartData = semesterStats.map(s => ({
    label: `Sem ${s.semester}`,
    value: s.avgCgpa
  }));

  const subjectChartData = subjectStats.map(s => ({
    label: s.subjectName,
    value: s.passPercentage,
    color: s.passPercentage >= 75 ? '#10b981' : s.passPercentage >= 50 ? '#f59e0b' : '#ef4444'
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>📊 Student Performance Analytics</h1>
        <p style={{ color: 'var(--text-muted)' }}>Comprehensive academic metrics, department aggregations, and student performance insights.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Students</div>
          <div className="metric-value">{summary.totalStudents}</div>
          <div className="metric-footer">across all departments</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Faculty</div>
          <div className="metric-value">{summary.totalFaculty}</div>
          <div className="metric-footer">active teaching staff</div>
        </div>
        <div className="metric-card success">
          <div className="metric-label">Overall Pass Rate</div>
          <div className="metric-value">{summary.overallPassPercentage}%</div>
          <div className="metric-footer"><span>{100 - summary.overallPassPercentage}%</span> fail rate</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average CGPA</div>
          <div className="metric-value">{summary.averageCgpa}</div>
          <div className="metric-footer">college-wide average</div>
        </div>
        <div className="metric-card danger">
          <div className="metric-label">Students with Arrears</div>
          <div className="metric-value">{summary.studentsWithArrears}</div>
          <div className="metric-footer">requiring academic support</div>
        </div>
      </div>

      {/* Highest & Lowest CGPA Highlight Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {summary.highestCgpaStudent && (
          <div style={highlightCardStyle('success')}>
            <div>🏆 <strong>Highest CGPA Student</strong></div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0' }}>
              {summary.highestCgpaStudent.name} ({summary.highestCgpaStudent.registerNumber})
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              Department: <strong>{summary.highestCgpaStudent.department}</strong> | Rank: <strong>#{summary.highestCgpaStudent.rank}</strong> | CGPA: <strong>{summary.highestCgpaStudent.cgpa}</strong> ({summary.highestCgpaStudent.percentage}%)
            </div>
          </div>
        )}

        {summary.lowestCgpaStudent && (
          <div style={highlightCardStyle('warning')}>
            <div>⚠️ <strong>Lowest CGPA Student (Needs Support)</strong></div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0' }}>
              {summary.lowestCgpaStudent.name} ({summary.lowestCgpaStudent.registerNumber})
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              Department: <strong>{summary.lowestCgpaStudent.department}</strong> | Rank: <strong>#{summary.lowestCgpaStudent.rank}</strong> | CGPA: <strong>{summary.lowestCgpaStudent.cgpa}</strong> ({summary.lowestCgpaStudent.percentage}%)
            </div>
          </div>
        )}
      </div>

      {/* Visual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <BarChart data={deptChartData} xKey="label" yKey="value" title="🏢 Department Student Distribution" height={220} />
        </div>
        <div style={cardStyle}>
          <DonutChart data={passFailData} title="🎯 Overall Pass vs Fail %" size={180} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <LineChart data={semChartData} xKey="label" yKey="value" title="📈 Semester Performance (Avg CGPA)" strokeColor="#3b82f6" height={200} />
        </div>
        <div style={cardStyle}>
          <BarChart data={subjectChartData} xKey="label" yKey="value" title="📘 Subject-wise Pass Percentage (%)" height={200} />
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>🏢 Department-wise Performance Summary</h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Students Count</th>
                <th>Avg CGPA</th>
                <th>Pass Rate</th>
                <th>Fail Rate</th>
              </tr>
            </thead>
            <tbody>
              {departmentStats.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{d.department}</td>
                  <td>{d.totalStudents}</td>
                  <td><span className="badge badge-primary">{d.avgCgpa}</span></td>
                  <td><span className="badge badge-success">{d.passPercentage}%</span></td>
                  <td><span className="badge badge-danger">{d.failPercentage}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 & Bottom 10 Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🏆 Top 10 Rankers</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Dept</th>
                  <th>CGPA</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((s, i) => (
                  <tr key={s._id}>
                    <td><span className="badge badge-warning">#{s.rank}</span></td>
                    <td style={{ fontWeight: 500 }}>{s.name} ({s.registerNumber})</td>
                    <td>{s.department}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{s.cgpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>⚠️ Bottom 10 Students (Academic Intervention)</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Dept</th>
                  <th>CGPA</th>
                </tr>
              </thead>
              <tbody>
                {bottom10.map((s, i) => (
                  <tr key={s._id}>
                    <td><span className="badge badge-danger">#{s.rank}</span></td>
                    <td style={{ fontWeight: 500 }}>{s.name} ({s.registerNumber})</td>
                    <td>{s.department}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{s.cgpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Styles ──
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

const highlightCardStyle = (type) => ({
  background: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
  border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
  borderRadius: '16px',
  padding: '1.25rem 1.5rem',
  color: 'var(--text-main)'
});

const alertStyle = (type) => ({
  padding: '0.85rem 1.2rem',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontWeight: 500,
  background: type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
  color: type === 'error' ? '#f87171' : '#34d399',
  border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
});

export default AdminAnalytics;
