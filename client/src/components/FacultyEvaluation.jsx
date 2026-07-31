import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';
import { ProgressRing, BarChart } from './Charts';

const FacultyEvaluation = ({ userRole }) => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/analytics/faculty');
      setFaculties(data.faculties || []);
      if (data.faculties?.length > 0) {
        setSelectedFaculty(data.faculties[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load faculty performance evaluation.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  if (loading) return <div className="full-page-loader"><Spinner /></div>;
  if (error) return <div style={alertStyle('error')}>{error}</div>;

  const scoreChartData = faculties.map(f => ({
    label: f.name.split(' ')[0],
    value: f.facultyPerformanceScore,
    color: f.facultyPerformanceScore >= 90 ? '#10b981' : f.facultyPerformanceScore >= 80 ? '#3b82f6' : '#f59e0b'
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>👨‍🏫 Faculty Performance Evaluation</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {userRole === 'admin'
            ? 'Comprehensive performance score, student outcomes, and teaching evaluation metrics for faculty.'
            : 'Your teaching performance score, student CGPA averages, attendance, and assignment metrics.'}
        </p>
      </div>

      {/* Overview Score Chart for Admin */}
      {userRole === 'admin' && faculties.length > 0 && (
        <div style={cardStyle}>
          <BarChart
            data={scoreChartData}
            xKey="label"
            yKey="value"
            title="📊 Faculty Performance Score Comparison (out of 100)"
            height={200}
          />
        </div>
      )}

      {/* Faculty Cards Grid / Selector */}
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {faculties.map(fac => (
          <button
            key={fac.facultyId}
            onClick={() => setSelectedFaculty(fac)}
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              border: selectedFaculty?.facultyId === fac.facultyId ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              background: selectedFaculty?.facultyId === fac.facultyId ? 'var(--primary-light)' : 'var(--bg-card)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              alignItems: 'flex-start',
              minWidth: '200px',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fac.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fac.department} • Staff ID: {fac.staffId || 'N/A'}</div>
            <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`badge ${badgeForCategory(fac.ratingCategory)}`}>
                Score: {fac.facultyPerformanceScore}/100
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Faculty Detailed Evaluation Card */}
      {selectedFaculty && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: 800 }}>
                {selectedFaculty.name}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Department: <strong style={{ color: 'var(--text-main)' }}>{selectedFaculty.department}</strong> | Staff ID: <strong>{selectedFaculty.staffId || 'N/A'}</strong> | Email: <strong>{selectedFaculty.email}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <ProgressRing
                score={selectedFaculty.facultyPerformanceScore}
                max={100}
                size={130}
                label="Performance Score"
                color={scoreColor(selectedFaculty.facultyPerformanceScore)}
              />
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Evaluation Rating</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: scoreColor(selectedFaculty.facultyPerformanceScore) }}>
                  {selectedFaculty.ratingCategory}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics breakdown */}
          <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="metric-card">
              <div className="metric-label">Subjects Handled</div>
              <div className="metric-value">{selectedFaculty.subjectsHandledCount}</div>
              <div className="metric-footer">
                {selectedFaculty.subjectsHandled.join(', ') || 'Department subjects'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Students Taught</div>
              <div className="metric-value">{selectedFaculty.totalStudentsTaught}</div>
              <div className="metric-footer">enrolled in department</div>
            </div>
            <div className="metric-card success">
              <div className="metric-label">Avg Student CGPA</div>
              <div className="metric-value">{selectedFaculty.averageStudentCgpa}</div>
              <div className="metric-footer">out of 10.0 scale</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Pass Percentage</div>
              <div className="metric-value">{selectedFaculty.passPercentage}%</div>
              <div className="metric-footer"><span>{selectedFaculty.failPercentage}%</span> fail percentage</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Average Attendance</div>
              <div className="metric-value">{selectedFaculty.averageAttendance}%</div>
              <div className="metric-footer">class attendance rate</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Assignment Completion</div>
              <div className="metric-value">{selectedFaculty.assignmentCompletionPercentage}%</div>
              <div className="metric-footer">average assignment score</div>
            </div>
          </div>

          {/* Evaluation Criteria Explanation */}
          <div style={infoBoxStyle}>
            <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.35rem' }}>
              💡 Faculty Performance Calculation Formula
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Faculty Performance Score = <strong>(Pass % × 0.40)</strong> + <strong>(Avg Student CGPA/10 × 30)</strong> + <strong>(Average Attendance % × 0.15)</strong> + <strong>(Assignment Completion % × 0.15)</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Complete Faculty Summary Table for Admin */}
      {userRole === 'admin' && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>📋 Faculty Evaluation Master Table</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Staff ID</th>
                  <th>Subjects</th>
                  <th>Students</th>
                  <th>Avg CGPA</th>
                  <th>Pass %</th>
                  <th>Attendance %</th>
                  <th>Performance Score</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {faculties.map(fac => (
                  <tr key={fac.facultyId}>
                    <td style={{ fontWeight: 600 }}>{fac.name}</td>
                    <td>{fac.department}</td>
                    <td><span className="badge badge-primary">{fac.staffId || 'N/A'}</span></td>
                    <td>{fac.subjectsHandledCount}</td>
                    <td>{fac.totalStudentsTaught}</td>
                    <td>{fac.averageStudentCgpa}</td>
                    <td><span className="badge badge-success">{fac.passPercentage}%</span></td>
                    <td>{fac.averageAttendance}%</td>
                    <td style={{ fontWeight: 700, color: scoreColor(fac.facultyPerformanceScore) }}>
                      {fac.facultyPerformanceScore} / 100
                    </td>
                    <td>
                      <span className={`badge ${badgeForCategory(fac.ratingCategory)}`}>
                        {fac.ratingCategory}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Shared Helpers & Styles ──
const scoreColor = (score) => {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
};

const badgeForCategory = (cat) => {
  if (cat === 'Outstanding' || cat === 'Excellent') return 'badge-success';
  if (cat === 'Good') return 'badge-warning';
  return 'badge-danger';
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

const infoBoxStyle = {
  background: 'rgba(59, 130, 246, 0.08)',
  border: '1px dashed rgba(59, 130, 246, 0.3)',
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

export default FacultyEvaluation;
