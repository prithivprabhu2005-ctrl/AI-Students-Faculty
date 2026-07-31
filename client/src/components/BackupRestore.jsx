import { useState } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const BackupRestore = () => {
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/backup/export');

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `edubot_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess('💾 Database backup exported and downloaded successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error exporting backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonInput(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleRestoreBackup = async (e) => {
    e.preventDefault();
    if (!jsonInput.trim()) {
      return setError('Please upload or paste a valid JSON backup payload.');
    }

    try {
      setRestoreLoading(true);
      setError('');
      const parsed = JSON.parse(jsonInput);
      await api.post('/backup/import', parsed);
      setSuccess('🎉 System database restored successfully from backup!');
      setJsonInput('');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid JSON format or restore failed.');
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>💾 Backup &amp; Restore Database</h1>
        <p style={{ color: 'var(--text-muted)' }}>Export MongoDB data to JSON backup files or restore database state from existing backups.</p>
      </div>

      {error && <div style={alertStyle('error')}>{error}</div>}
      {success && <div style={alertStyle('success')}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Export Card */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>📤 Export Database Backup</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Download a full JSON backup file containing all Students, Subjects, Attendance, Assignments, and System Settings records.
          </p>
          <button className="btn btn-primary" onClick={handleExportBackup} disabled={loading}>
            {loading ? 'Generating Backup…' : '💾 Export & Download JSON Backup'}
          </button>
        </div>

        {/* Restore Card */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>📥 Restore Database Backup</h3>
          <form onSubmit={handleRestoreBackup}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Upload JSON Backup File</label>
              <input type="file" accept=".json" className="form-control" onChange={handleFileUpload} />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Or Paste JSON Backup Content</label>
              <textarea
                className="form-control"
                rows="4"
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder='{"version": "1.0.0", "data": {...}}'
              />
            </div>

            <button type="submit" className="btn btn-secondary" disabled={restoreLoading || !jsonInput.trim()}>
              {restoreLoading ? 'Restoring…' : '🔄 Restore Database'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
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

const alertStyle = (type) => ({
  padding: '0.85rem 1.2rem',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontWeight: 500,
  background: type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
  color: type === 'error' ? '#f87171' : '#34d399',
  border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
});

export default BackupRestore;
