import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

import PlacementReadiness from './PlacementReadiness';

const AIInsights = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState(null);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [iRes, aRes] = await Promise.all([
        api.get('/ai/insights'),
        api.get('/ai/smart-alerts')
      ]);
      setInsights(iRes.data);
      setSmartAlerts(aRes.data.alerts || []);
    } catch (err) {
      setError('Failed to load AI Insights & Smart Alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="full-page-loader"><Spinner /></div>;

  const filteredAlerts = smartAlerts.filter(a => !filterType || a.type === filterType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>💡 AI Intelligence &amp; Smart Recommendations</h1>
        <p style={{ color: 'var(--text-muted)' }}>Automated intelligent recommendations, placement readiness scoring, risk alerts, and academic optimization.</p>
      </div>

      {/* Top Section Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0px' }}>
        <button
          onClick={() => setActiveTab('insights')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'insights' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'insights' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.65rem 1rem',
            fontWeight: activeTab === 'insights' ? 700 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          💡 Actionable Recommendations
        </button>
        <button
          onClick={() => setActiveTab('placement')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'placement' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'placement' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.65rem 1rem',
            fontWeight: activeTab === 'placement' ? 700 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          🎯 Placement Readiness Analysis
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'alerts' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'alerts' ? 'var(--primary)' : 'var(--text-muted)',
            padding: '0.65rem 1rem',
            fontWeight: activeTab === 'alerts' ? 700 : 500,
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          🚨 Smart Alerts Feed ({smartAlerts.length})
        </button>
      </div>

      {error && <div style={alertStyle('error')}>{error}</div>}

      {/* TAB 1: Placement Readiness */}
      {activeTab === 'placement' && (
        <PlacementReadiness userRole={userRole} />
      )}

      {/* TAB 2: Actionable Recommendations */}
      {activeTab === 'insights' && insights && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🤖 AI Actionable Recommendations ({userRole.toUpperCase()})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {insights.recommendations?.map((rec, i) => (
              <div key={i} style={recCardStyle(rec.type)}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                  {rec.category}
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.5, opacity: 0.95 }}>
                  {rec.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Smart Alerts Feed */}
      {activeTab === 'alerts' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={cardTitleStyle}>🚨 Smart Alerts &amp; Achievements Feed</h3>
            <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Smart Alerts</option>
              <option value="Low Attendance">Low Attendance Warnings</option>
              <option value="Too Many Arrears">Arrear Risk Alerts</option>
              <option value="Topper Achievement">Topper Achievements</option>
            </select>
          </div>

          {filteredAlerts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No smart alerts match the selected criteria.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredAlerts.map(alert => (
                <div key={alert.id} style={alertItemStyle(alert.severity)}>
                  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '1.4rem' }}>
                      {alert.severity === 'danger' ? '🚨' : alert.severity === 'warning' ? '⚠️' : '🏆'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{alert.title}</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{alert.message}</div>
                    </div>
                  </div>
                </div>
              ))}
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
  padding: '1.5rem',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
};

const cardTitleStyle = {
  fontFamily: 'var(--font-title)',
  fontSize: '1.1rem',
  fontWeight: 700
};

const recCardStyle = (type) => ({
  background: type === 'danger' ? 'rgba(239,68,68,0.1)' : type === 'warning' ? 'rgba(245,158,11,0.1)' : type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
  border: `1px solid ${type === 'danger' ? 'rgba(239,68,68,0.3)' : type === 'warning' ? 'rgba(245,158,11,0.3)' : type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
  borderRadius: '14px',
  padding: '1.25rem',
  color: 'var(--text-main)'
});

const alertItemStyle = (sev) => ({
  background: sev === 'danger' ? 'rgba(239,68,68,0.08)' : sev === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
  border: `1px solid ${sev === 'danger' ? 'rgba(239,68,68,0.3)' : sev === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
  borderRadius: '12px',
  padding: '1rem 1.25rem'
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

export default AIInsights;
