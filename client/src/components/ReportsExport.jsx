import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SUBJECTS = [
  { key: 'english', label: 'English' },
  { key: 'mathematics', label: 'Mathematics' },
  { key: 'programming', label: 'Programming' },
  { key: 'database', label: 'Database Systems' },
  { key: 'operatingSystems', label: 'Operating Systems' },
  { key: 'computerNetworks', label: 'Computer Networks' }
];

const ReportsExport = ({ userRole }) => {
  const [reportType, setReportType] = useState('department');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('mathematics');
  const [batchYear, setBatchYear] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        reportType,
        ...(department && { department }),
        ...(semester && { semester }),
        ...(subject && { subject }),
        ...(batchYear && { batchYear })
      });

      const { data } = await api.get(`/reports/generate?${params.toString()}`);
      setReportData(data.report || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [reportType, department, semester, subject, batchYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Export to Excel / CSV File Download
  const handleExportCSV = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) return;

    const headers = Object.keys(reportData.rows[0]);
    const csvLines = [];
    csvLines.push(headers.join(','));

    reportData.rows.forEach(row => {
      const values = headers.map(h => {
        const val = row[h] === undefined || row[h] === null ? '' : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvLines.push(values.join(','));
    });

    const csvString = csvLines.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>📥 Reports &amp; Export Center</h1>
          <p style={{ color: 'var(--text-muted)' }}>Generate filterable academic reports and export in Excel (CSV) or PDF format.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV} disabled={!reportData?.rows?.length}>
            📊 Export to Excel (.csv)
          </button>
          <button className="btn btn-primary" onClick={handlePrintPDF}>
            🖨️ Export PDF / Print
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div style={cardStyle}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          🔍 Report Filters
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Report Type</label>
            <select className="form-control" value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="department">Department Report</option>
              <option value="semester">Semester Report</option>
              <option value="subject">Subject Report</option>
              <option value="faculty">Faculty Report</option>
              <option value="student">Student Master Report</option>
            </select>
          </div>

          <div className="form-group">
            <label>Department</label>
            <select className="form-control" value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Semester</label>
            <select className="form-control" value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="">All Semesters</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          {reportType === 'subject' && (
            <div className="form-group">
              <label>Select Subject</label>
              <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)}>
                {SUBJECTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Batch Year</label>
            <select className="form-control" value={batchYear} onChange={e => setBatchYear(e.target.value)}>
              <option value="">All Batches</option>
              {[2021, 2022, 2023, 2024, 2025].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Generated Report Area */}
      <div style={cardStyle} className="printable-report">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div>
        ) : error ? (
          <div style={alertStyle('error')}>{error}</div>
        ) : reportData ? (
          <div>
            <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', fontWeight: 800 }}>
                  {reportData.title || 'Academic Performance Report'}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.9rem', padding: '0.4rem 0.85rem' }}>
                EduBot Official Report
              </span>
            </div>

            {/* Summary statistics bar */}
            {reportData.summary && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <div style={summaryPillStyle}>Total Students: <strong>{reportData.summary.totalStudents}</strong></div>
                <div style={summaryPillStyle}>Pass Rate: <strong style={{ color: 'var(--success)' }}>{reportData.summary.passPercentage}%</strong></div>
                <div style={summaryPillStyle}>Avg CGPA: <strong>{reportData.summary.averageCgpa}</strong></div>
              </div>
            )}

            {/* Data table */}
            {reportData.rows && reportData.rows.length > 0 ? (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {Object.keys(reportData.rows[0]).map((col, i) => (
                        <th key={i}>{col.replace(/([A-Z])/g, ' $1').toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        {Object.values(row).map((val, colIdx) => (
                          <td key={colIdx}>
                            {colIdx === 0 ? <span className="badge badge-primary">{String(val)}</span> : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                No records match the selected filter criteria.
              </p>
            )}
          </div>
        ) : null}
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

const summaryPillStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  padding: '0.5rem 1rem',
  fontSize: '0.88rem',
  color: 'var(--text-muted)'
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

export default ReportsExport;
