import { useState, useEffect } from 'react';
import api from '../services/api';

const AISummaryWidget = () => {
  const [bullets, setBullets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data } = await api.get('/ai/dashboard-summary');
        setBullets(data.summaryBullets || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div style={widgetCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '1.4rem' }}>🤖</div>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
          AI Executive Summary
        </h3>
      </div>

      {loading ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generating AI summary...</div>
      ) : (
        <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {bullets.map((b, i) => (
            <li key={i}>
              <strong style={{ color: 'var(--text-main)' }}>{b}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const widgetCardStyle = {
  background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.08))',
  border: '1px solid rgba(59,130,246,0.3)',
  borderRadius: '16px',
  padding: '1.25rem 1.5rem',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)'
};

export default AISummaryWidget;
