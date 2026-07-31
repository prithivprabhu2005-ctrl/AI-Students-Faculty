import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

// ──────────────────────────────────────────────────────────────
// AcademicRecords Component
// Combines Attendance & Assignment Marks under "📚 Academic Records"
// Supports Admin (full view), Faculty (manage/mark/edit), and Student (view own)
// ──────────────────────────────────────────────────────────────

const AcademicRecords = ({ userRole }) => {
  // Main Tab: 'attendance' | 'assignments'
  const [activeTab, setActiveTab] = useState('attendance');

  // Shared Reference Data
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-clear success and error messages
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  // Fetch subjects on mount
  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/academic/subjects');
      setSubjects(data.subjects || []);
    } catch (err) {
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>📚 Academic Records</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {userRole !== 'student' && 'Comprehensive view & management of student attendance and assignment performance records.'}
          {userRole === 'student' && 'Track your attendance records and assignment performance.'}
        </p>
      </div>

      {/* Primary Alerts */}
      {error && <div style={alertStyle('error')}>{error}</div>}
      {success && <div style={alertStyle('success')}>{success}</div>}

      {/* Main Tab Navigation */}
      <div style={tabContainerStyle}>
        <button
          onClick={() => setActiveTab('attendance')}
          style={mainTabBtn(activeTab === 'attendance')}
        >
          📅 Attendance
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          style={mainTabBtn(activeTab === 'assignments')}
        >
          📝 Assignment Marks
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Spinner />
        </div>
      ) : activeTab === 'attendance' ? (
        <AttendanceTab
          userRole={userRole}
          subjects={subjects}
          setError={setError}
          setSuccess={setSuccess}
        />
      ) : (
        <AssignmentTab
          userRole={userRole}
          subjects={subjects}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
    </div>
  );
};

// ==============================================================================
// ATTENDANCE TAB COMPONENT
// ==============================================================================
const AttendanceTab = ({ userRole, subjects, setError, setSuccess }) => {
  // Mode for Faculty: 'mark' | 'view'
  const [facultyMode, setFacultyMode] = useState(userRole === 'faculty' ? 'mark' : 'view');

  // Attendance Records Data
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [fetchingRecords, setFetchingRecords] = useState(false);

  // Faculty Mark Attendance State
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [studentsForMarking, setStudentsForMarking] = useState([]);
  const [statusMap, setStatusMap] = useState({}); // { [studentId]: 'Present'|'Absent' }
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Attendance Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Editing single attendance status (Faculty)
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch Attendance Records
  const fetchAttendanceRecords = useCallback(async () => {
    try {
      setFetchingRecords(true);
      const { data } = await api.get('/academic/attendance');
      setAttendanceRecords(data.attendance || []);
    } catch (err) {
      setError('Failed to load attendance records.');
    } finally {
      setFetchingRecords(false);
    }
  }, [setError]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Load students when Faculty selects subject + date in 'mark' mode
  useEffect(() => {
    if (userRole === 'student' || facultyMode !== 'mark' || !selectedSubject) return;

    const loadStudentsForSubject = async () => {
      try {
        setStudentsLoading(true);
        const subjectObj = subjects.find(s => s._id === selectedSubject);
        const { data } = await api.get('/students');

        // Filter students matching subject's department (and sem if available)
        let deptStudents = (data.students || []).filter(
          st => st.department === subjectObj?.department
        );

        if (subjectObj?.semester) {
          deptStudents = deptStudents.filter(st => Number(st.semester) === Number(subjectObj.semester));
        }

        setStudentsForMarking(deptStudents);

        // Pre-fill status map from existing records or default to 'Present'
        const dateStr = selectedDate;
        const existing = attendanceRecords.filter(a => {
          const aDate = new Date(a.date).toISOString().split('T')[0];
          return a.subject?._id === selectedSubject && aDate === dateStr;
        });

        const map = {};
        deptStudents.forEach(st => { map[st._id] = 'Present'; });
        existing.forEach(rec => {
          if (rec.student?._id) map[rec.student._id] = rec.status;
        });

        setStatusMap(map);
      } catch (err) {
        setError('Failed to load students for attendance marking.');
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudentsForSubject();
  }, [selectedSubject, selectedDate, subjects, facultyMode, userRole, attendanceRecords, setError]);

  // Toggle single student status
  const toggleStudentStatus = (studentId) => {
    setStatusMap(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  // Bulk mark all Present or Absent
  const markAllStudents = (status) => {
    const map = {};
    studentsForMarking.forEach(st => { map[st._id] = status; });
    setStatusMap(map);
  };

  // Save Bulk Attendance
  const handleSaveAttendance = async () => {
    if (!selectedSubject || !selectedDate) {
      return setError('Please select both a subject and date.');
    }
    if (studentsForMarking.length === 0) {
      return setError('No students found for this subject department/semester.');
    }

    try {
      setSavingAttendance(true);
      const records = studentsForMarking.map(st => ({
        studentId: st._id,
        status: statusMap[st._id] || 'Present'
      }));

      const { data } = await api.post('/academic/attendance/bulk', {
        subjectId: selectedSubject,
        date: selectedDate,
        records
      });

      setSuccess(`✅ ${data.message}`);
      fetchAttendanceRecords();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving attendance records.');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Update Existing Single Attendance Record (Faculty)
  const handleUpdateRecordStatus = async (recordId, currentStatus) => {
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    try {
      setUpdatingId(recordId);
      await api.put(`/academic/attendance/${recordId}`, { status: newStatus });
      setSuccess(`✅ Attendance record updated to ${newStatus}.`);
      setAttendanceRecords(prev =>
        prev.map(r => r._id === recordId ? { ...r, status: newStatus } : r)
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update attendance status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtering Records Logic
  const filteredRecords = attendanceRecords.filter(r => {
    const rDept = r.department || r.student?.department || r.subject?.department;
    const rSem = r.student?.semester || r.subject?.semester;
    const rSec = r.student?.section;
    const rSubId = r.subject?._id;
    const rDate = r.date ? new Date(r.date).toISOString().split('T')[0] : '';

    if (filterDept && rDept !== filterDept) return false;
    if (filterSem && String(rSem) !== String(filterSem)) return false;
    if (filterSection && rSec !== filterSection) return false;
    if (filterSubject && rSubId !== filterSubject) return false;
    if (filterDate && rDate !== filterDate) return false;
    if (filterStatus && r.status !== filterStatus) return false;

    return true;
  });

  // Calculate overall attendance metrics
  const totalClasses = filteredRecords.length;
  const totalPresent = filteredRecords.filter(r => r.status === 'Present').length;
  const overallPercentage = totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : null;

  // Group subject-wise percentage for summary cards
  const subjectSummaries = subjects.map(s => {
    const recs = attendanceRecords.filter(r => r.subject?._id === s._id);
    const tot = recs.length;
    const pres = recs.filter(r => r.status === 'Present').length;
    const pct = tot > 0 ? ((pres / tot) * 100).toFixed(1) : null;
    return { ...s, total: tot, present: pres, pct };
  }).filter(s => s.total > 0);

  const presentCount = Object.values(statusMap).filter(s => s === 'Present').length;
  const totalMarkingCount = studentsForMarking.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Sub-toggle for Admin/Staff */}
      {userRole !== 'student' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={`btn ${facultyMode === 'mark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFacultyMode('mark')}
          >
            ✅ Mark Attendance
          </button>
          <button
            className={`btn ${facultyMode === 'view' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setFacultyMode('view'); fetchAttendanceRecords(); }}
          >
            📊 View &amp; Update Records
          </button>
        </div>
      )}

      {/* Overall Metric Cards */}
      <div className="metrics-grid">
        <div className={`metric-card ${overallPercentage !== null ? (parseFloat(overallPercentage) >= 75 ? 'success' : parseFloat(overallPercentage) >= 60 ? 'warning' : 'danger') : ''}`}>
          <div className="metric-label">Overall Attendance</div>
          <div className="metric-value">{overallPercentage !== null ? `${overallPercentage}%` : '—'}</div>
          <div className="metric-footer">
            <span>{totalPresent}</span> of {totalClasses} classes attended
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Records</div>
          <div className="metric-value">{totalClasses}</div>
          <div className="metric-footer">tracked attendance entries</div>
        </div>
        <div className="metric-card success">
          <div className="metric-label">Present Count</div>
          <div className="metric-value">{totalPresent}</div>
          <div className="metric-footer">total present entries</div>
        </div>
        <div className="metric-card danger">
          <div className="metric-label">Absent Count</div>
          <div className="metric-value">{totalClasses - totalPresent}</div>
          <div className="metric-footer">total absent entries</div>
        </div>
      </div>

      {/* Faculty Mode: Mark Attendance */}
      {userRole === 'faculty' && facultyMode === 'mark' && (
        <>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Select Subject &amp; Date to Mark Attendance</h3>
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
                      {s.subjectCode} – {s.subjectName} (Sem {s.semester} / {s.department})
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

          {selectedSubject && (
            <div style={cardStyle}>
              {studentsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h3 style={cardTitleStyle}>
                      Student Roll Call
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                        {totalMarkingCount} students
                      </span>
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={badgePill('success')}>{presentCount} Present</span>
                      <span style={badgePill('danger')}>{totalMarkingCount - presentCount} Absent</span>
                      <button className="btn btn-secondary" style={smBtnStyle} onClick={() => markAllStudents('Present')}>All Present</button>
                      <button className="btn btn-secondary" style={smBtnStyle} onClick={() => markAllStudents('Absent')}>All Absent</button>
                    </div>
                  </div>

                  {studentsForMarking.length === 0 ? (
                    <div style={emptyStateStyle}>No students found for this subject department/semester.</div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Register No.</th>
                            <th>Student Name</th>
                            <th>Dept</th>
                            <th>Semester</th>
                            <th>Section</th>
                            <th>Attendance Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentsForMarking.map((st, i) => {
                            const isPresent = (statusMap[st._id] || 'Present') === 'Present';
                            return (
                              <tr key={st._id}>
                                <td style={{ color: 'var(--text-muted)', width: '40px' }}>{i + 1}</td>
                                <td><span className="badge badge-primary">{st.registerNumber}</span></td>
                                <td style={{ fontWeight: 500 }}>{st.name}</td>
                                <td>{st.department}</td>
                                <td>Sem {st.semester}</td>
                                <td>{st.section || 'A'}</td>
                                <td>
                                  <button
                                    onClick={() => toggleStudentStatus(st._id)}
                                    style={toggleBtnStyle(isPresent)}
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
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance || studentsForMarking.length === 0}
                    >
                      {savingAttendance ? 'Saving Attendance…' : '💾 Save Attendance'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* View Records Mode (Admin, Student, & Faculty view mode) */}
      {(userRole !== 'faculty' || facultyMode === 'view') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Subject Wise Summary Grid */}
          {subjectSummaries.length > 0 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                📊 Subject-wise Attendance Breakdown
              </h3>
              <div className="metrics-grid">
                {subjectSummaries.map(s => {
                  const pct = parseFloat(s.pct);
                  const color = pct >= 75 ? 'success' : pct >= 60 ? 'warning' : 'danger';
                  return (
                    <div key={s._id} className={`metric-card ${color}`}>
                      <div className="metric-label">{s.subjectCode}</div>
                      <div className="metric-value">{s.pct}%</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.subjectName}</div>
                      <div className="metric-footer">
                        <span>{s.present}</span> of {s.total} sessions attended
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attendance Records Table & Filters */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={cardTitleStyle}>
                {userRole === 'student' ? 'My Attendance Log' : 'Attendance Records'}
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing {filteredRecords.length} of {attendanceRecords.length} records
              </span>
            </div>

            {/* Filter Bar: Department, Semester, Section, Subject, Date, Status */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {userRole === 'admin' && (
                <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}

              <select className="filter-select" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>

              <select className="filter-select" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                <option value="">All Sections</option>
                {['A', 'B', 'C', 'D'].map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
              </select>

              <select className="filter-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectCode} – {s.subjectName}</option>)}
              </select>

              <input
                type="date"
                className="filter-select"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                placeholder="Filter by Date"
              />

              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>

              {(filterDept || filterSem || filterSection || filterSubject || filterDate || filterStatus) && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    setFilterDept('');
                    setFilterSem('');
                    setFilterSection('');
                    setFilterSubject('');
                    setFilterDate('');
                    setFilterStatus('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Table */}
            {fetchingRecords ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
            ) : filteredRecords.length === 0 ? (
              <div style={emptyStateStyle}>No attendance records found matching your filters.</div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      {userRole !== 'student' && <th>Student Name</th>}
                      {userRole !== 'student' && <th>Register No.</th>}
                      {userRole !== 'student' && <th>Dept</th>}
                      {userRole !== 'student' && <th>Sem</th>}
                      {userRole !== 'student' && <th>Sec</th>}
                      <th>Subject</th>
                      <th>Subject Code</th>
                      <th>Date</th>
                      <th>Status</th>
                      {userRole === 'faculty' && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(r => (
                      <tr key={r._id}>
                        {userRole !== 'student' && <td style={{ fontWeight: 500 }}>{r.student?.name || r.studentName || '—'}</td>}
                        {userRole !== 'student' && <td><span className="badge badge-primary">{r.student?.registerNumber || r.registerNumber}</span></td>}
                        {userRole !== 'student' && <td>{r.department || r.student?.department || '—'}</td>}
                        {userRole !== 'student' && <td>{r.student?.semester ? `Sem ${r.student.semester}` : '—'}</td>}
                        {userRole !== 'student' && <td>{r.student?.section || '—'}</td>}
                        <td style={{ fontWeight: 500 }}>{r.subject?.subjectName || '—'}</td>
                        <td><span className="badge badge-primary">{r.subject?.subjectCode || r.subjectCode || '—'}</span></td>
                        <td>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <span className={`badge ${r.status === 'Present' ? 'badge-success' : 'badge-danger'}`}>
                            {r.status}
                          </span>
                        </td>
                        {userRole === 'faculty' && (
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                              disabled={updatingId === r._id}
                              onClick={() => handleUpdateRecordStatus(r._id, r.status)}
                            >
                              {updatingId === r._id ? 'Updating…' : `Toggle to ${r.status === 'Present' ? 'Absent' : 'Present'}`}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// ASSIGNMENT TAB COMPONENT
// ==============================================================================
const AssignmentTab = ({ userRole, subjects, setError, setSuccess }) => {
  // Mode for Faculty/Admin: 'add' | 'view'
  const [facultyMode, setFacultyMode] = useState(userRole !== 'student' ? 'add' : 'view');

  // Assignment Records Data
  const [assignments, setAssignments] = useState([]);
  const [fetchingAssignments, setFetchingAssignments] = useState(false);

  // Faculty Add Assignment Marks Form State
  const [selectedSubject, setSelectedSubject] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [submissionDate, setSubmissionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [studentsForMarks, setStudentsForMarks] = useState([]);
  const [marksMap, setMarksMap] = useState({}); // { [studentId]: { obtainedMarks: '', remarks: '' } }
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Filters for Assignment Records
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTitle, setFilterTitle] = useState('');

  // Editing Single Assignment Record State (Faculty)
  const [editModalRecord, setEditModalRecord] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTotalMarks, setEditTotalMarks] = useState('');
  const [editObtainedMarks, setEditObtainedMarks] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  // Fetch Assignments
  const fetchAssignments = useCallback(async () => {
    try {
      setFetchingAssignments(true);
      const { data } = await api.get('/academic/assignments');
      setAssignments(data.assignments || []);
    } catch (err) {
      setError('Failed to load assignment records.');
    } finally {
      setFetchingAssignments(false);
    }
  }, [setError]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Load students for selected subject (Faculty Add Marks Mode)
  useEffect(() => {
    if (userRole === 'student' || facultyMode !== 'add' || !selectedSubject) return;

    const loadStudents = async () => {
      try {
        setStudentsLoading(true);
        const subjectObj = subjects.find(s => s._id === selectedSubject);
        const { data } = await api.get('/students');

        let deptStudents = (data.students || []).filter(st => st.department === subjectObj?.department);
        if (subjectObj?.semester) {
          deptStudents = deptStudents.filter(st => Number(st.semester) === Number(subjectObj.semester));
        }
        setStudentsForMarks(deptStudents);

        const map = {};
        deptStudents.forEach(st => { map[st._id] = { obtainedMarks: '', remarks: '' }; });
        setMarksMap(map);
      } catch (err) {
        setError('Failed to load students for assignment marks entry.');
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudents();
  }, [selectedSubject, subjects, facultyMode, userRole, setError]);

  const handleMarkChange = (studentId, field, value) => {
    setMarksMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  // Validation
  const validateMarks = () => {
    const max = Number(totalMarks);
    for (const [id, m] of Object.entries(marksMap)) {
      if (m.obtainedMarks === '' || m.obtainedMarks === undefined) continue;
      if (Number(m.obtainedMarks) > max) {
        const st = studentsForMarks.find(s => s._id === id);
        return `${st?.name || 'A student'}'s obtained marks (${m.obtainedMarks}) exceed total marks (${max}).`;
      }
      if (Number(m.obtainedMarks) < 0) {
        return 'Obtained marks cannot be negative.';
      }
    }
    return null;
  };

  // Save Assignment Marks (Faculty)
  const handleSaveMarks = async () => {
    if (!selectedSubject || !assignmentTitle.trim() || !totalMarks) {
      return setError('Subject, assignment title, and total marks are required.');
    }

    const valErr = validateMarks();
    if (valErr) return setError(valErr);

    const toSave = studentsForMarks.filter(st => marksMap[st._id]?.obtainedMarks !== '');
    if (toSave.length === 0) {
      return setError('Please enter marks for at least one student.');
    }

    try {
      setSavingMarks(true);
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

      // Reset
      const resetMap = {};
      studentsForMarks.forEach(st => { resetMap[st._id] = { obtainedMarks: '', remarks: '' }; });
      setMarksMap(resetMap);
      setAssignmentTitle('');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving assignment marks.');
    } finally {
      setSavingMarks(false);
    }
  };

  // Edit Assignment Modal Handlers (Faculty)
  const openEditModal = (rec) => {
    setEditModalRecord(rec);
    setEditTitle(rec.assignmentTitle || '');
    setEditTotalMarks(rec.totalMarks || 100);
    setEditObtainedMarks(rec.obtainedMarks || 0);
    setEditDate(rec.submissionDate ? new Date(rec.submissionDate).toISOString().split('T')[0] : '');
    setEditRemarks(rec.remarks || '');
  };

  const handleUpdateAssignment = async () => {
    if (!editModalRecord) return;
    if (Number(editObtainedMarks) > Number(editTotalMarks)) {
      return setError('Obtained marks cannot exceed total marks.');
    }
    if (Number(editObtainedMarks) < 0) {
      return setError('Obtained marks cannot be negative.');
    }

    try {
      setUpdatingAssignment(true);
      const { data } = await api.put(`/academic/assignments/${editModalRecord._id}`, {
        assignmentTitle: editTitle,
        totalMarks: Number(editTotalMarks),
        obtainedMarks: Number(editObtainedMarks),
        submissionDate: editDate,
        remarks: editRemarks
      });

      setSuccess('✅ Assignment record updated successfully.');
      setAssignments(prev => prev.map(a => a._id === editModalRecord._id ? data : a));
      setEditModalRecord(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update assignment record.');
    } finally {
      setUpdatingAssignment(false);
    }
  };

  // Filtered Assignment List
  const filteredAssignments = assignments.filter(a => {
    const aDept = a.department || a.student?.department || a.subject?.department;
    const aSem = a.student?.semester || a.subject?.semester;
    const aSubId = a.subject?._id;
    const aTitle = a.assignmentTitle || '';

    if (filterDept && aDept !== filterDept) return false;
    if (filterSem && String(aSem) !== String(filterSem)) return false;
    if (filterSubject && aSubId !== filterSubject) return false;
    if (filterTitle && !aTitle.toLowerCase().includes(filterTitle.toLowerCase())) return false;

    return true;
  });

  // Calculate Metrics
  const totalAssigns = filteredAssignments.length;
  const totalScored = filteredAssignments.reduce((sum, a) => sum + (a.obtainedMarks || 0), 0);
  const totalMaxMarks = filteredAssignments.reduce((sum, a) => sum + (a.totalMarks || 0), 0);
  const avgScorePct = totalMaxMarks > 0 ? ((totalScored / totalMaxMarks) * 100).toFixed(1) : null;

  // Extract unique assignment titles for filter dropdown
  const uniqueTitles = [...new Set(assignments.map(a => a.assignmentTitle).filter(Boolean))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Sub-toggle for Admin/Staff */}
      {userRole !== 'student' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={`btn ${facultyMode === 'add' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFacultyMode('add')}
          >
            📝 Add Assignment Marks
          </button>
          <button
            className={`btn ${facultyMode === 'view' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setFacultyMode('view'); fetchAssignments(); }}
          >
            📋 View &amp; Edit Records
          </button>
        </div>
      )}

      {/* Assignment Performance Metrics */}
      <div className="metrics-grid">
        <div className={`metric-card ${avgScorePct !== null ? (parseFloat(avgScorePct) >= 75 ? 'success' : parseFloat(avgScorePct) >= 50 ? 'warning' : 'danger') : ''}`}>
          <div className="metric-label">Assignment Score Average</div>
          <div className="metric-value">{avgScorePct !== null ? `${avgScorePct}%` : '—'}</div>
          <div className="metric-footer">
            <span>{totalScored}</span> of {totalMaxMarks} total marks scored
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Submissions</div>
          <div className="metric-value">{totalAssigns}</div>
          <div className="metric-footer">evaluated assignment records</div>
        </div>
      </div>

      {/* Faculty Mode: Add Marks */}
      {userRole === 'faculty' && facultyMode === 'add' && (
        <>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Assignment Meta Information</h3>
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
                <label>Assignment Title *</label>
                <input
                  className="form-control"
                  value={assignmentTitle}
                  onChange={e => setAssignmentTitle(e.target.value)}
                  placeholder="e.g. Assignment 1 – Data Structures"
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

          {selectedSubject && (
            <div style={cardStyle}>
              {studentsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
              ) : (
                <>
                  <h3 style={cardTitleStyle}>
                    Enter Marks for Students
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                      {studentsForMarks.length} students
                    </span>
                  </h3>

                  {studentsForMarks.length === 0 ? (
                    <div style={emptyStateStyle}>No students found for this subject's department.</div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Register No.</th>
                            <th>Student Name</th>
                            <th>Department</th>
                            <th>Obtained Marks / {totalMarks || '?'}</th>
                            <th>Remarks</th>
                            <th>Score %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentsForMarks.map((st, i) => {
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
                                <td>{st.department}</td>
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
                                  {isOver && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Exceeds max!</div>}
                                </td>
                                <td>
                                  <input
                                    className="form-control"
                                    style={{ width: '160px' }}
                                    value={marksMap[st._id]?.remarks}
                                    onChange={e => handleMarkChange(st._id, 'remarks', e.target.value)}
                                    placeholder="Optional remark…"
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
                      onClick={handleSaveMarks}
                      disabled={savingMarks || studentsForMarks.length === 0}
                    >
                      {savingMarks ? 'Saving Marks…' : '💾 Save Assignment Marks'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* View & Edit Records Mode */}
      {(userRole !== 'faculty' || facultyMode === 'view') && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={cardTitleStyle}>
              {userRole === 'student' ? 'My Assignment Marks' : 'Assignment Records'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredAssignments.length} of {assignments.length} records
            </span>
          </div>

          {/* Filter Bar: Department, Semester, Subject, Assignment */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {userRole === 'admin' && (
              <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}

            <select className="filter-select" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>

            <select className="filter-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectCode} – {s.subjectName}</option>)}
            </select>

            <select className="filter-select" value={filterTitle} onChange={e => setFilterTitle(e.target.value)}>
              <option value="">All Assignment Titles</option>
              {uniqueTitles.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {(filterDept || filterSem || filterSubject || filterTitle) && (
              <button
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={() => {
                  setFilterDept('');
                  setFilterSem('');
                  setFilterSubject('');
                  setFilterTitle('');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Table */}
          {fetchingAssignments ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spinner /></div>
          ) : filteredAssignments.length === 0 ? (
            <div style={emptyStateStyle}>No assignment records found matching your filters.</div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    {userRole !== 'student' && <th>Student Name</th>}
                    {userRole !== 'student' && <th>Register No.</th>}
                    {userRole !== 'student' && <th>Dept</th>}
                    <th>Subject</th>
                    <th>Assignment Title</th>
                    <th>Obtained / Total</th>
                    <th>Score %</th>
                    <th>Remarks</th>
                    <th>Submission Date</th>
                    {userRole === 'faculty' && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(a => {
                    const pct = a.totalMarks ? ((a.obtainedMarks / a.totalMarks) * 100).toFixed(1) : '—';
                    return (
                      <tr key={a._id}>
                        {userRole !== 'student' && <td style={{ fontWeight: 500 }}>{a.student?.name || a.studentName || '—'}</td>}
                        {userRole !== 'student' && <td><span className="badge badge-primary">{a.student?.registerNumber || a.registerNumber}</span></td>}
                        {userRole !== 'student' && <td>{a.department || a.student?.department || '—'}</td>}
                        <td style={{ fontWeight: 500 }}>{a.subject?.subjectName || '—'}</td>
                        <td>{a.assignmentTitle}</td>
                        <td>
                          <strong>{a.obtainedMarks}</strong> / <span style={{ color: 'var(--text-muted)' }}>{a.totalMarks}</span>
                        </td>
                        <td>
                          <span className={`badge ${parseFloat(pct) >= 75 ? 'badge-success' : parseFloat(pct) >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                            {pct}%
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{a.remarks || '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {new Date(a.submissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        {userRole === 'faculty' && (
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                              onClick={() => openEditModal(a)}
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Edit Assignment Marks (Faculty) */}
      {editModalRecord && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '1rem' }}>
              ✏️ Edit Assignment Marks
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Student</label>
                <input className="form-control" disabled value={`${editModalRecord.student?.name || editModalRecord.studentName} (${editModalRecord.student?.registerNumber || editModalRecord.registerNumber})`} />
              </div>
              <div className="form-group">
                <label>Assignment Title</label>
                <input className="form-control" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Total Marks</label>
                  <input type="number" className="form-control" value={editTotalMarks} onChange={e => setEditTotalMarks(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Obtained Marks</label>
                  <input type="number" className="form-control" value={editObtainedMarks} onChange={e => setEditObtainedMarks(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Submission Date</label>
                <input type="date" className="form-control" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <input className="form-control" value={editRemarks} onChange={e => setEditRemarks(e.target.value)} placeholder="Optional remark…" />
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setEditModalRecord(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateAssignment} disabled={updatingAssignment}>
                {updatingAssignment ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Inline & Shared Styles ──
const tabContainerStyle = {
  display: 'flex',
  gap: '1rem',
  borderBottom: '2px solid var(--border-color)',
  paddingBottom: '0px'
};

const mainTabBtn = (active) => ({
  background: 'none',
  border: 'none',
  borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  padding: '0.75rem 1.25rem',
  fontFamily: 'var(--font-title)',
  fontSize: '1.05rem',
  fontWeight: active ? 700 : 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  marginBottom: '-2px'
});

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1.75rem',
  boxShadow: 'var(--shadow)'
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

const toggleBtnStyle = (isPresent) => ({
  padding: '0.45rem 1rem',
  borderRadius: '999px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.82rem',
  transition: 'all 0.2s',
  background: isPresent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
  color: isPresent ? '#34d399' : '#f87171',
  minWidth: '95px'
});

const smBtnStyle = {
  padding: '0.5rem 0.85rem',
  fontSize: '0.82rem'
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '2.5rem 1.5rem',
  color: 'var(--text-muted)',
  fontSize: '0.95rem',
  background: 'rgba(255, 255, 255, 0.01)',
  borderRadius: '12px',
  border: '1px dashed var(--border-color)'
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem'
};

const modalContentStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '2rem',
  width: '100%',
  maxWidth: '520px',
  boxShadow: 'var(--shadow)'
};

export default AcademicRecords;
