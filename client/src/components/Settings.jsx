import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';
import { getStoredTheme, applyTheme, THEME_KEY } from '../utils/theme';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Theme State
  const [themePreference, setThemePreference] = useState(getStoredTheme());
  const [activeAppliedTheme, setActiveAppliedTheme] = useState(applyTheme());

  // Form states
  const [collegeName, setCollegeName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [currentSemester, setCurrentSemester] = useState(5);
  const [defaultPassingMarks, setDefaultPassingMarks] = useState(50);
  const [defaultAttendancePercentage, setDefaultAttendancePercentage] = useState(75);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/settings');
      const s = data.settings || {};
      setSettings(s);
      setCollegeName(s.collegeName || '');
      setAcademicYear(s.academicYear || '');
      setCurrentSemester(s.currentSemester || 5);
      setDefaultPassingMarks(s.defaultPassingMarks || 50);
      setDefaultAttendancePercentage(s.defaultAttendancePercentage || 75);
    } catch (err) {
      setError('Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleThemeChange = (choice) => {
    setThemePreference(choice);
    localStorage.setItem(THEME_KEY, choice);
    const resolved = applyTheme(choice);
    setActiveAppliedTheme(resolved);
    setSuccess('Theme updated successfully.');
    setTimeout(() => setSuccess(''), 3500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await api.put('/settings', {
        collegeName,
        academicYear,
        currentSemester: Number(currentSemester),
        defaultPassingMarks: Number(defaultPassingMarks),
        defaultAttendancePercentage: Number(defaultAttendancePercentage)
      });
      setSuccess('System settings updated successfully!');
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="full-page-loader"><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>⚙️ Admin System &amp; Appearance Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Configure application themes, college parameters, academic thresholds, and AI settings.</p>
      </div>

      {/* Alerts */}
      {error && <div style={alertStyle('error')}>{error}</div>}
      {success && <div style={alertStyle('success')}>{success}</div>}

      {/* ── Section 1: Appearance & Theme Settings ── */}
      <div style={cardStyle}>
        <h2 style={sectionHeaderStyle}>🎨 Appearance &amp; Theme Customization</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Select your preferred visual style across all pages, navigation, components, tables, and AI tools.
        </p>

        {/* Theme Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Light Mode */}
          <div
            onClick={() => handleThemeChange('light')}
            style={themeOptionCardStyle(themePreference === 'light')}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☀️</div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-color)' }}>Light Mode</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Clean slate background with high-contrast slate text.
            </p>
          </div>

          {/* Dark Mode */}
          <div
            onClick={() => handleThemeChange('dark')}
            style={themeOptionCardStyle(themePreference === 'dark')}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌙</div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-color)' }}>Dark Mode</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Sleek dark navy palette tailored for low-light environments.
            </p>
          </div>

          {/* System Default */}
          <div
            onClick={() => handleThemeChange('system')}
            style={themeOptionCardStyle(themePreference === 'system')}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💻</div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-color)' }}>System Default</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Automatically synchronizes with your operating system preference.
            </p>
          </div>
        </div>

        {/* Currently Active Theme Preview Card */}
        <div style={{
          background: 'var(--bg-muted, rgba(255,255,255,0.03))',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Currently Active Theme Preview
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-main)' }}>
              {themePreference === 'system' ? `💻 System Default (${activeAppliedTheme.toUpperCase()})` : themePreference === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </div>
          </div>

          {/* Mini UI Component Preview Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}>
              Preview Component
            </span>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
              Sample Action Button
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 2: College System Parameters ── */}
      <div style={cardStyle}>
        <h2 style={sectionHeaderStyle}>🏫 College &amp; Academic Settings</h2>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>College Name *</label>
              <input className="form-control" value={collegeName} onChange={e => setCollegeName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Academic Year</label>
              <input className="form-control" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2025-2026" />
            </div>

            <div className="form-group">
              <label>Current Semester</label>
              <select className="form-control" value={currentSemester} onChange={e => setCurrentSemester(e.target.value)}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Default Passing Marks (%)</label>
              <input type="number" className="form-control" value={defaultPassingMarks} onChange={e => setDefaultPassingMarks(e.target.value)} min="35" max="100" />
            </div>

            <div className="form-group">
              <label>Required Attendance Target (%)</label>
              <input type="number" className="form-control" value={defaultAttendancePercentage} onChange={e => setDefaultAttendancePercentage(e.target.value)} min="50" max="100" />
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving Settings…' : '💾 Save Settings'}
            </button>
          </div>
        </form>
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

const sectionHeaderStyle = {
  fontSize: '1.2rem',
  fontWeight: 700,
  marginBottom: '0.75rem',
  fontFamily: 'var(--font-title)'
};

const themeOptionCardStyle = (isActive) => ({
  background: isActive ? 'var(--primary-light)' : 'var(--bg-card)',
  border: `2px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
  borderRadius: '14px',
  padding: '1.25rem',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  transform: isActive ? 'scale(1.02)' : 'none',
  boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
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

export default Settings;
