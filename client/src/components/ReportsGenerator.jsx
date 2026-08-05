import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const ReportsGenerator = ({ userRole }) => {
  const [reportType, setReportType] = useState('department');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [dbSubjects, setDbSubjects] = useState([]);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const { data } = await api.get('/academic/subjects');
        const list = data.subjects || [];
        setDbSubjects(list);
        if (list.length > 0) {
          setSubject(list[0].subjectName || list[0].subjectCode);
        }
      } catch (err) {
        console.error('Error loading subjects for reports generator:', err);
      }
    };
    loadSubjects();
  }, []);

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

      const { data } = await api.get(`/analytics/reports?${params.toString()}`);
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>📊 Performance Reports Generator</h1>
          <p style={{ color: 'var(--text-muted)' }}>Generate and print detailed department, semester, subject, faculty, and student reports.</p>
        </div>
        <button className="btn btn-primary" onClick={handlePrint}>
          🖨️ Print / Save PDF
        </button>
      </div>

      {/* Filter Control Bar */}
      <div style={cardStyle}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          🔍 Report Controls &amp; Filters
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Report Type</label>
            <select className="form-control" value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="department">Department Report</option>
              <option value="semester">Semester Report</option>
              <option value="subject">Subject Report</option>
              <option value="faculty">Faculty Report</option>
              <option value="student">Student Performance Report</option>
            </select>
          </div>

          <div className="form-group">
            <label>Department Filter</label>
            <select className="form-control" value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Semester Filter</label>
            <select className="form-control" value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="">All Semesters</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          {reportType === 'subject' && (
            <div className="form-group">
              <label>Select Subject</label>
              <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)}>
                {dbSubjects.length === 0 && <option value="">No subjects available</option>}
                {dbSubjects.map(s => (
                  <option key={s._id} value={s.subjectName || s.subjectCode}>
                    {s.subjectCode ? `${s.subjectCode} - ${s.subjectName}` : s.subjectName}
                  </option>
                ))}
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

      {/* Generated Report Display Area */}
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

            {/* Summary Metrics Bar if present */}
            {reportData.totalStudents !== undefined && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <div style={summaryPillStyle}>Total Students: <strong>{reportData.totalStudents}</strong></div>
                {reportData.passPercentage !== undefined && (
                  <div style={summaryPillStyle}>Pass Rate: <strong style={{ color: 'var(--success)' }}>{reportData.passPercentage}%</strong></div>
                )}
                {reportData.averageCgpa !== undefined && (
                  <div style={summaryPillStyle}>Avg CGPA: <strong>{reportData.averageCgpa}</strong></div>
                )}
              </div>
            )}

            {/* Student Table */}
            {reportData.students && reportData.students.length > 0 ? (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Register No.</th>
                      <th>Student Name</th>
                      <th>Dept</th>
                      <th>Sem</th>
                      {reportType === 'subject' ? (
                        <>
                          <th>Internal</th>
                          <th>External</th>
                          <th>Total</th>
                          <th>Grade</th>
                        </>
                      ) : (
                        <>
                          <th>CGPA</th>
                          <th>Rank</th>
                          <th>Arrears</th>
                          <th>Result</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.students.map((st, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td><span className="badge badge-primary">{st.registerNumber}</span></td>
                        <td style={{ fontWeight: 500 }}>{st.name}</td>
                        <td>{st.department}</td>
                        <td>{st.semester || '—'}</td>
                        {reportType === 'subject' ? (
                          <>
                            <td>{st.internal}</td>
                            <td>{st.external}</td>
                            <td style={{ fontWeight: 700 }}>{st.total}</td>
                            <td><span className="badge badge-primary">{st.grade}</span></td>
                          </>
                        ) : (
                          <>
                            <td style={{ fontWeight: 700 }}>{st.cgpa}</td>
                            <td><span className="badge badge-warning">#{st.rank}</span></td>
                            <td>{st.arrears}</td>
                            <td>
                              <span className={`badge ${st.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                                {st.result}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : reportData.faculties && reportData.faculties.length > 0 ? (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Faculty Name</th>
                      <th>Staff ID</th>
                      <th>Department</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.faculties.map(f => (
                      <tr key={f._id}>
                        <td style={{ fontWeight: 600 }}>{f.name}</td>
                        <td><span className="badge badge-primary">{f.staffId || 'N/A'}</span></td>
                        <td>{f.department}</td>
                        <td>{f.email}</td>
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

export default ReportsGenerator;
