import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

// ──────────────────────────────────────────────────────────────
// AssignmentManagement Component
// Faculty: Add/Edit assignment marks per student per subject
// Admin: View all assignment records
// ──────────────────────────────────────────────────────────────

const AssignmentManagement = ({ userRole }) => {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('add'); // 'add' | 'view'

  // Form state (shared for all students in a batch)
  const [selectedSubject, setSelectedSubject] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [submissionDate, setSubmissionDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Per-student marks: { [studentId]: { obtainedMarks: '', remarks: '' } }
  const [marksMap, setMarksMap] = useState({});

  // Filter for view mode
  const [filterSubject, setFilterSubject] = useState('');

  // Auto-clear alerts
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    try {
      const { data } = await api.get('/academic/subjects');
      setSubjects(data.subjects || []);
    } catch {
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all assignments
  const fetchAssignments = useCallback(async () => {
    try {
      const { data } = await api.get('/academic/assignments');
      setAssignments(data.assignments || []);
    } catch {
      setError('Failed to load assignment records.');
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
    if (userRole === 'admin') fetchAssignments();
  }, [fetchSubjects, fetchAssignments, userRole]);

  // Load students when subject changes
  useEffect(() => {
    if (!selectedSubject || userRole !== 'faculty') return;

    const loadStudents = async () => {
      try {
        setStudentsLoading(true);
        setError('');

        const subjectObj = subjects.find(s => s._id === selectedSubject);
        const { data } = await api.get('/students');
        const deptStudents = (data.students || []).filter(st => st.department === subjectObj?.department);

        setStudents(deptStudents);

        // Initialize marks map with empty values
        const map = {};
        deptStudents.forEach(st => { map[st._id] = { obtainedMarks: '', remarks: '' }; });
        setMarksMap(map);
      } catch {
        setError('Failed to load students.');
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudents();
  }, [selectedSubject, subjects, userRole]);

  const handleMarkChange = (studentId, field, value) => {
    setMarksMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  // Validate marks before saving
  const validateMarks = () => {
    const max = Number(totalMarks);
    for (const [id, m] of Object.entries(marksMap)) {
      if (m.obtainedMarks === '' || m.obtainedMarks === undefined) continue;
      if (Number(m.obtainedMarks) > max) {
        const st = students.find(s => s._id === id);
        return `${st?.name || 'A student'}'s obtained marks (${m.obtainedMarks}) exceed total marks (${max}).`;
      }
      if (Number(m.obtainedMarks) < 0) {
        return 'Obtained marks cannot be negative.';
      }
    }
    return null;
  };

  // Save assignment marks for all students
  const handleSave = async () => {
    if (!selectedSubject || !assignmentTitle.trim() || !totalMarks) {
      return setError('Subject, assignment title, and total marks are required.');
    }

    const validationError = validateMarks();
    if (validationError) return setError(validationError);

    // Only save students who have marks entered
    const toSave = students.filter(st => marksMap[st._id]?.obtainedMarks !== '');
    if (toSave.length === 0) {
      return setError('Please enter marks for at least one student.');
    }

    try {
      setSaving(true);
      setError('');

      // Save each student's marks
      const promises = toSave.map(st => api.post('/academic/assignments', {
        studentId: st._id,
        subjectId: selectedSubject,
        assignmentTitle: assignmentTitle.trim(),
        totalMarks: Number(totalMarks),
        obtainedMarks: Number(marksMap[st._id].obtainedMarks),
        submissionDate,
        remarks: marksMap[st._id].remarks || ''
      }));

      await Promise.all(promises);
      setSuccess(`✅ Assignment marks saved for ${toSave.length} student(s).`);

      // Reset marks after save
      const resetMap = {};
      students.forEach(st => { resetMap[st._id] = { obtainedMarks: '', remarks: '' }; });
      setMarksMap(resetMap);
      setAssignmentTitle('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving assignment marks.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}><Spinner /></div>;

  const filteredAssignments = assignments.filter(a =>
    !filterSubject || a.subject?._id === filterSubject
  );

  // Group assignments by title for admin view
  const uniqueTitles = [...new Set(filteredAssignments.map(a => a.assignmentTitle))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>📝 Assignment Marks</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {userRole === 'faculty' ? 'Enter and manage assignment marks for your students.' : 'View all assignment records.'}
        </p>
      </div>

      {/* Alerts */}
      {error && <div style={alertStyle('error')}>{error}</div>}
      {success && <div style={alertStyle('success')}>{success}</div>}

      {/* Tab toggle for faculty */}
      {userRole === 'faculty' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={`btn ${viewMode === 'add' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('add')}>
            ➕ Add Marks
          </button>
          <button className={`btn ${viewMode === 'view' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setViewMode('view'); fetchAssignments(); }}
          >
            📋 View Records
          </button>
        </div>
      )}

      {/* ── Faculty: Add Marks ── */}
      {(userRole === 'faculty' && viewMode === 'add') && (
        <>
          {/* Assignment details */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Assignment Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Subject *</label>
                <select className="form-control" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                  <option value="">— Select Subject —</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>{s.subjectCode} – {s.subjectName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Assignment Title *</label>
                <input
                  className="form-control"
                  value={assignmentTitle}
                  onChange={e => setAssignmentTitle(e.target.value)}
                  placeholder="e.g. Assignment 1 – Linked Lists"
                />
              </div>
              <div className="form-group">
                <label>Total Marks *</label>
                <input
                  type="number"
                  className="form-control"
                  value={totalMarks}
                  onChange={e => setTotalMarks(e.target.value)}
                  min="1"
                  placeholder="100"
                />
              </div>
              <div className="form-group">
                <label>Submission Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={submissionDate}
                  onChange={e => setSubmissionDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Student marks table */}
          {selectedSubject && (
            <div style={cardStyle}>
              {studentsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
              ) : (
                <>
                  <h3 style={cardTitleStyle}>
                    Enter Marks
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                      {students.length} students
                    </span>
                  </h3>

                  {students.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No students found for this subject's department.</p>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Register No.</th>
                            <th>Student Name</th>
                            <th>Obtained Marks / {totalMarks || '?'}</th>
                            <th>Remarks</th>
                            <th>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((st, i) => {
                            const obtained = marksMap[st._id]?.obtainedMarks;
                            const pct = obtained !== '' && totalMarks
                              ? ((Number(obtained) / Number(totalMarks)) * 100).toFixed(1)
                              : null;
                            const isOver = obtained !== '' && Number(obtained) > Number(totalMarks);
                            return (
                              <tr key={st._id}>
                                <td style={{ color: 'var(--text-muted)', width: '40px' }}>{i + 1}</td>
                                <td><span className="badge badge-primary">{st.registerNumber}</span></td>
                                <td style={{ fontWeight: 500 }}>{st.name}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{
                                      width: '110px',
                                      borderColor: isOver ? 'var(--danger)' : undefined
                                    }}
                                    min="0"
                                    max={totalMarks}
                                    value={obtained}
                                    onChange={e => handleMarkChange(st._id, 'obtainedMarks', e.target.value)}
                                    placeholder="0"
                                  />
                                  {isOver && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Exceeds total!</div>}
                                </td>
                                <td>
                                  <input
                                    className="form-control"
                                    style={{ width: '150px' }}
                                    value={marksMap[st._id]?.remarks}
                                    onChange={e => handleMarkChange(st._id, 'remarks', e.target.value)}
                                    placeholder="Optional…"
                                  />
                                </td>
                                <td>
                                  {pct !== null ? (
                                    <span className={`badge ${Number(pct) >= 75 ? 'badge-success' : Number(pct) >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                                      {pct}%
                                    </span>
                                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
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
                      {saving ? 'Saving…' : '💾 Save Marks'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── View Records (Faculty view mode & Admin) ── */}
      {(viewMode === 'view' || userRole === 'admin') && (
        <div style={cardStyle}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <select className="filter-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectCode} – {s.subjectName}</option>)}
            </select>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Register No.</th>
                  <th>Subject</th>
                  <th>Assignment</th>
                  <th>Marks</th>
                  <th>Percentage</th>
                  <th>Remarks</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found.</td></tr>
                ) : filteredAssignments.map(a => {
                  const pct = a.totalMarks ? ((a.obtainedMarks / a.totalMarks) * 100).toFixed(1) : '—';
                  return (
                    <tr key={a._id}>
                      <td style={{ fontWeight: 500 }}>{a.student?.name || a.studentName || '—'}</td>
                      <td><span className="badge badge-primary">{a.student?.registerNumber || a.registerNumber}</span></td>
                      <td>{a.subject?.subjectName || '—'}</td>
                      <td>{a.assignmentTitle}</td>
                      <td>{a.obtainedMarks} / {a.totalMarks}</td>
                      <td>
                        <span className={`badge ${parseFloat(pct) >= 75 ? 'badge-success' : parseFloat(pct) >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                          {pct}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{a.remarks || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(a.submissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
  fontSize: '0.9rem',
  fontWeight: 500,
  background: type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
  color: type === 'error' ? '#f87171' : '#34d399',
  border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
});

export default AssignmentManagement;
