import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const PlacementReadiness = ({ userRole = 'student', searchRegNo = null }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inputRegNo, setInputRegNo] = useState(searchRegNo || '');

  const fetchAnalysis = async (targetRegNo) => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (targetRegNo) params.registerNumber = targetRegNo;
      const res = await api.get('/ai/placement-readiness', { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate placement readiness analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(searchRegNo);
  }, [searchRegNo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputRegNo.trim()) {
      fetchAnalysis(inputRegNo.trim());
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="dashboard-section-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span>🎯</span> AI Placement Readiness Analysis
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Comprehensive AI evaluation of academic performance, technical skills, certifications, projects & internships.
          </p>
        </div>

        {userRole !== 'student' && (
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Enter Student Reg No (e.g. 21CS045)"
              value={inputRegNo}
              onChange={(e) => setInputRegNo(e.target.value)}
              className="search-input"
              style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: '220px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
              🔍 Analyze
            </button>
          </form>
        )}
      </div>

      {error && <div className="auth-alert error">{error}</div>}

      {loading ? (
        <Spinner />
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No placement analysis available. Please search for a student register number.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Info Banner & Readiness Score Gauge */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center'
          }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                {data.student.department} Department
              </span>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{data.student.name}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Register No: <strong>{data.student.registerNumber}</strong> | CGPA: <strong>{data.student.cgpa}</strong> | Attendance: <strong>{data.student.attendancePercentage}%</strong>
              </p>
            </div>

            {/* Score Ring Gauge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center' }}>
              <div style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(${getScoreColor(data.readinessScore)} ${data.readinessScore * 3.6}deg, #e5e7eb 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{
                  width: '92px',
                  height: '92px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: getScoreColor(data.readinessScore), lineHeight: 1 }}>
                    {data.readinessScore}%
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                    READINESS
                  </span>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.25rem 0' }}>
                  {data.readinessScore >= 80 ? '🌟 Placement Ready (High)' : data.readinessScore >= 60 ? '⚡ Progressing (Moderate)' : '⚠️ Needs Preparation (Low)'}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, maxWidth: '200px' }}>
                  Based on academic metrics, projects, certifications & technical skills.
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics Breakdown Chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div style={metricCardStyle}>
              <div style={{ fontSize: '1.4rem' }}>🏆</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{data.metrics.totalCertifications}</div>
              <div style={metricLabelStyle}>Certifications</div>
            </div>
            <div style={metricCardStyle}>
              <div style={{ fontSize: '1.4rem' }}>💻</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{data.metrics.totalProjects}</div>
              <div style={metricLabelStyle}>Projects</div>
            </div>
            <div style={metricCardStyle}>
              <div style={{ fontSize: '1.4rem' }}>🏢</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{data.metrics.totalInternships}</div>
              <div style={metricLabelStyle}>Internships</div>
            </div>
            <div style={metricCardStyle}>
              <div style={{ fontSize: '1.4rem' }}>⚡</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{data.metrics.totalSkills}</div>
              <div style={metricLabelStyle}>Total Skills</div>
            </div>
            <div style={metricCardStyle}>
              <div style={{ fontSize: '1.4rem' }}>🏅</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{data.metrics.totalSports}</div>
              <div style={metricLabelStyle}>Sports / Medals</div>
            </div>
          </div>

          {/* Strengths vs Weaknesses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Strengths */}
            <div style={sectionCardStyle('#ecfdf5', '#10b981')}>
              <h3 style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                💪 Key Strengths
              </h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.strengths.map((str, idx) => (
                  <li key={idx} style={{ color: 'var(--text-color)', fontSize: '0.92rem' }}>{str}</li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div style={sectionCardStyle('#fef2f2', '#ef4444')}>
              <h3 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                🛠️ Improvement Areas
              </h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.weaknesses.map((wk, idx) => (
                  <li key={idx} style={{ color: 'var(--text-color)', fontSize: '0.92rem' }}>{wk}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendations & Target Companies */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Recommended Skills & Certifications */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🚀 Recommended Upskilling
              </h3>
              <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Recommended Technical Skills:</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {data.recommendedSkills.map((sk, idx) => (
                    <span key={idx} className="badge badge-primary" style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}>
                      + {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Recommended Certifications:</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {data.recommendedCertifications.map((cert, idx) => (
                    <span key={idx} className="badge badge-warning" style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}>
                      🎓 {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggested Career Roles & Target Companies */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💼 Career & Recruiter Alignment
              </h3>
              <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Suggested Career Roles:</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {data.suggestedRoles.map((role, idx) => (
                    <span key={idx} className="badge badge-success" style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}>
                      💼 {role}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Top Recruiter Companies:</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {data.suggestedCompanies.map((comp, idx) => (
                    <span key={idx} style={{
                      background: 'var(--bg-muted, #f3f4f6)',
                      color: 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      padding: '0.25rem 0.5rem',
                      fontWeight: 500
                    }}>
                      🏢 {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
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

const metricLabelStyle = {
  fontSize: '0.78rem',
  color: 'var(--text-muted)',
  fontWeight: 600
};

const sectionCardStyle = (bgColor, borderColor) => ({
  background: 'var(--bg-card)',
  border: `1px solid ${borderColor}`,
  borderRadius: '12px',
  padding: '1.25rem'
});

export default PlacementReadiness;
