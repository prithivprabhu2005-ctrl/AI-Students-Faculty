import { useState, useEffect } from 'react';
import api from '../services/api';

export const RiskStudentsWidget = ({ userRole }) => {
  const [atRisk, setAtRisk] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        if (userRole === 'student') return;
        const { data } = await api.get('/prediction/all');
        setAtRisk((data.studentsAtRisk || []).slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, [userRole]);

  if (userRole === 'student') return null;

  return (
    <div style={widgetCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
          ⚠️ Students at Risk (AI Alert)
        </h4>
        <span className="badge badge-danger">{atRisk.length} Priority</span>
      </div>

      {loading ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Analyzing risk data...</div>
      ) : atRisk.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🎉 No high/medium risk students identified!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {atRisk.map(s => (
            <div key={s.studentId} style={rowItemStyle}>
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{s.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.department} • Reg: {s.registerNumber}</div>
              </div>
              <span className={`badge ${s.riskLevel === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                {s.passProbability}% Pass Prob
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TopPerformersWidget = ({ userRole }) => {
  const [topList, setTopList] = useState([]);

  useEffect(() => {
    const fetchTop = async () => {
      try {
        if (userRole === 'student') return;
        const { data } = await api.get('/analytics/admin');
        setTopList((data.top10 || []).slice(0, 4));
      } catch (err) {
        console.error(err);
      }
    };
    fetchTop();
  }, [userRole]);

  if (userRole === 'student') return null;

  return (
    <div style={widgetCardStyle}>
      <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--text-main)' }}>
        🏆 Top Academic Performers
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {topList.map(s => (
          <div key={s._id} style={rowItemStyle}>
            <div>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{s.name}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.department}</div>
            </div>
            <span className="badge badge-success">Rank #{s.rank} ({s.cgpa} CGPA)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Shared Widget Styles ──
const widgetCardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '14px',
  padding: '1.25rem',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)'
};

const rowItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0.75rem',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px'
};
