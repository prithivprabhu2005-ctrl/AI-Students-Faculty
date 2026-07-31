import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

// ──────────────────────────────────────────────────────────────
// AttendanceManagement Component
// Faculty: Select subject + date → mark Present/Absent per student
// Admin: View all attendance records
// ──────────────────────────────────────────────────────────────

const AttendanceManagement = ({ userRole }) => {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [statusMap, setStatusMap] = useState({}); // { studentId: 'Present'|'Absent' }
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('mark'); // 'mark' | 'view'

  // Auto-clear alerts
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  // Fetch subjects on mount
  const fetchSubjects = useCallback(async () => {
    try {
      const { data } = await api.get('/academic/subjects');
      setSubjects(data.subjects || []);
    } catch (err) {
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all attendance records (for view mode)
  const fetchAttendance = useCallback(async () => {
    try {
      const { data } = await api.get('/academic/attendance');
      setAttendance(data.attendance || []);
    } catch (err) {
      setError('Failed to load attendance records.');
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // When subject + date are selected, fetch students and pre-fill attendance
  useEffect(() => {
    if (!selectedSubject || !selectedDate || userRole !== 'faculty') return;

    const loadStudentsAndAttendance = async () => {
      try {
        setStudentsLoading(true);
        setError('');

        // Get all students
        const { data: sData } = await api.get('/students');
        const subjectObj = subjects.find(s => s._id === selectedSubject);

        // Filter students by subject's department
        const deptStudents = (sData.students || []).filter(
          st => st.department === subjectObj?.department
        );
        setStudents(deptStudents);

        // Get existing attendance for this subject + date
        const { data: aData } = await api.get('/academic/attendance');
        const dateStr = selectedDate;
        const existing = (aData.attendance || []).filter(a => {
          const aDate = new Date(a.date).toISOString().split('T')[0];
          return a.subject?._id === selectedSubject && aDate === dateStr;
        });

        // Pre-fill map with existing records; default others to 'Present'
        const map = {};
        deptStudents.forEach(st => { map[st._id] = 'Present'; });
        existing.forEach(rec => {
          if (rec.student?._id) map[rec.student._id] = rec.status;
        });
        setStatusMap(map);
      } catch (err) {
        setError('Failed to load students.');
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudentsAndAttendance();
  }, [selectedSubject, selectedDate, subjects, userRole]);

  // Toggle Present/Absent for a student
  const toggleStatus = (studentId) => {
    setStatusMap(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  // Mark all present / all absent
  const markAll = (status) => {
    const map = {};
    students.forEach(st => { map[st._id] = status; });
    setStatusMap(map);
  };

  // Save attendance (bulk)
  const handleSave = async () => {
    if (!selectedSubject || !selectedDate) {
      return setError('Please select a subject and date.');
    }
    if (students.length === 0) {
      return setError('No students found for this subject department.');
    }

    try {
      setSaving(true);
      setError('');

      const records = students.map(st => ({
        studentId: st._id,
        status: statusMap[st._id] || 'Present'
      }));

      const { data } = await api.post('/academic/attendance/bulk', {
        subjectId: selectedSubject,
        date: selectedDate,
        records
      });

      setSuccess(`✅ ${data.message}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate attendance percentage for a subject
  const calcPercentage = (subjectId) => {
    const records = attendance.filter(a => a.subject?._id === subjectId);
    if (records.length === 0) return null;
    const present = records.filter(r => r.status === 'Present').length;
    return ((present / records.length) * 100).toFixed(1);
  };

  if (loading) return <div style={{ padding: '2rem' }}><Spinner /></div>;

  const presentCount = Object.values(statusMap).filter(s => s === 'Present').length;
  const totalCount = students.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>📅 Attendance Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {userRole === 'faculty' ? 'Mark attendance for your students.' : 'View all attendance records.'}
        </p>
      </div>

      {/* Alerts */}
      {error && <div style={alertStyle('error')}>{error}</div>}
      {success && <div style={alertStyle('success')}>{success}</div>}

      {/* View toggle for faculty */}
      {userRole === 'faculty' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={`btn ${viewMode === 'mark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('mark')}
          >
            ✅ Mark Attendance
          </button>
          <button
            className={`btn ${viewMode === 'view' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setViewMode('view'); fetchAttendance(); }}
          >
            📊 View Records
          </button>
        </div>
      )}

      {/* ── Faculty: Mark Attendance ── */}
      {(userRole === 'faculty' && viewMode === 'mark') && (
        <>
          {/* Controls */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Select Subject & Date</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Subject *</label>
                <select
                  className="form-control"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                >
                  <option value="">— Select Subject —</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.subjectCode} – {s.subjectName} (Sem {s.semester})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Student list */}
          {selectedSubject && selectedDate && (
            <div style={cardStyle}>
              {studentsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
              ) : (
                <>
                  {/* Summary bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h3 style={cardTitleStyle}>
                      Student Attendance
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                        {totalCount} students
                      </span>
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* Present/absent count */}
                      <span style={{ ...badgePill('success') }}>{presentCount} Present</span>
                      <span style={{ ...badgePill('danger') }}>{totalCount - presentCount} Absent</span>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }} onClick={() => markAll('Present')}>All Present</button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }} onClick={() => markAll('Absent')}>All Absent</button>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>No students found for this department.</p>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Register No.</th>
                            <th>Student Name</th>
                            <th>Semester</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((st, i) => {
                            const isPresent = (statusMap[st._id] || 'Present') === 'Present';
                            return (
                              <tr key={st._id}>
                                <td style={{ color: 'var(--text-muted)', width: '50px' }}>{i + 1}</td>
                                <td><span className="badge badge-primary">{st.registerNumber}</span></td>
                                <td style={{ fontWeight: 500 }}>{st.name}</td>
                                <td>Sem {st.semester}</td>
                                <td>
                                  <button
                                    onClick={() => toggleStatus(st._id)}
                                    style={{
                                      padding: '0.45rem 1rem',
                                      borderRadius: '999px',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      fontSize: '0.82rem',
                                      transition: 'all 0.2s',
                                      background: isPresent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                      color: isPresent ? '#34d399' : '#f87171',
                                      minWidth: '90px'
                                    }}
                                  >
                                    {isPresent ? '✅ Present' : '❌ Absent'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="form-actions" style={{ marginTop: '1rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saving || students.length === 0}
                    >
                      {saving ? 'Saving…' : '💾 Save Attendance'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── View Records (Faculty & Admin) ── */}
      {(viewMode === 'view' || userRole === 'admin') && (
        <AttendanceRecordsView
          userRole={userRole}
          subjects={subjects}
          onLoad={setAttendance}
        />
      )}
    </div>
  );
};

// ── Sub-component: View attendance records with summary ──
const AttendanceRecordsView = ({ userRole, subjects }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/academic/attendance');
        setRecords(data.attendance || []);
      } catch {
        setError('Failed to load attendance records.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>;

  const filtered = records.filter(r => {
    const matchSub = !filterSubject || r.subject?._id === filterSubject;
    const matchStatus = !filterStatus || r.status === filterStatus;
    return matchSub && matchStatus;
  });

  // Group for percentage calculation
  const subjectSummary = subjects.map(s => {
    const subRecords = records.filter(r => r.subject?._id === s._id);
    const total = subRecords.length;
    const present = subRecords.filter(r => r.status === 'Present').length;
    const pct = total > 0 ? ((present / total) * 100).toFixed(1) : null;
    return { ...s, total, present, pct };
  }).filter(s => s.total > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div style={alertStyle('error')}>{error}</div>}

      {/* Subject attendance summary cards */}
      {subjectSummary.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            📊 Subject-wise Attendance
          </h3>
          <div className="metrics-grid">
            {subjectSummary.map(s => {
              const pct = parseFloat(s.pct);
              const color = pct >= 75 ? 'success' : pct >= 60 ? 'warning' : 'danger';
              return (
                <div key={s._id} className={`metric-card ${color}`}>
                  <div className="metric-label">{s.subjectCode}</div>
                  <div className="metric-value">{s.pct}%</div>
                  <div className="metric-footer">
                    <span>{s.present}</span> of {s.total} classes attended
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Records table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select className="filter-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectCode} – {s.subjectName}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Register No.</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found.</td></tr>
              ) : filtered.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 500 }}>{r.student?.name || r.studentName || '—'}</td>
                  <td><span className="badge badge-primary">{r.student?.registerNumber || r.registerNumber}</span></td>
                  <td>{r.subject?.subjectName || r.subjectCode || '—'}</td>
                  <td>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <span className={`badge ${r.status === 'Present' ? 'badge-success' : 'badge-danger'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Shared Styles ──
const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1.75rem',
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
  marginBottom: '1rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  background: type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
  color: type === 'error' ? '#f87171' : '#34d399',
  border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
});

const badgePill = (type) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.3rem 0.75rem',
  borderRadius: '999px',
  fontSize: '0.8rem',
  fontWeight: 600,
  background: type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
  color: type === 'success' ? '#34d399' : '#f87171'
});

export default AttendanceManagement;
