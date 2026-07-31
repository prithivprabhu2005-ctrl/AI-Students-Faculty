import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const CLASS_TYPES = ['Theory', 'Practical', 'Lab'];

const DEFAULT_PERIOD_TIMES = {
  1: { start: '09:00 AM', end: '09:50 AM' },
  2: { start: '09:50 AM', end: '10:40 AM' },
  3: { start: '10:50 AM', end: '11:40 AM' },
  4: { start: '11:40 AM', end: '12:30 PM' },
  5: { start: '01:30 PM', end: '02:20 PM' },
  6: { start: '02:20 PM', end: '03:10 PM' },
  7: { start: '03:20 PM', end: '04:10 PM' },
  8: { start: '04:10 PM', end: '05:00 PM' }
};

const TimetableManagement = ({ mode = 'student' }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'faculty';

  const [activeTab, setActiveTab] = useState('weekly');
  const [timetable, setTimetable] = useState([]);
  const [metrics, setMetrics] = useState({ totalClasses: 0, totalLabHours: 0 });
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filters
  const [deptFilter, setDeptFilter] = useState(user?.department || 'CSE');
  const [semFilter, setSemFilter] = useState(1);
  const [secFilter, setSecFilter] = useState('A');
  const [dayFilter, setDayFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState({
    department: 'CSE',
    academicYear: 2025,
    semester: 1,
    section: 'A',
    day: 'Monday',
    period: 1,
    startTime: '09:00 AM',
    endTime: '09:50 AM',
    subject: '',
    facultyName: '',
    classroom: '',
    classType: 'Theory'
  });

  const fetchTimetableData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (deptFilter) params.department = deptFilter;
      if (semFilter) params.semester = semFilter;
      if (secFilter) params.section = secFilter;
      if (dayFilter) params.day = dayFilter;
      if (searchQuery) params.search = searchQuery;

      const [res, todayRes] = await Promise.all([
        api.get('/timetable', { params }),
        api.get('/timetable/today', { params })
      ]);

      setTimetable(res.data.timetable || []);
      setMetrics(res.data.metrics || { totalClasses: 0, totalLabHours: 0 });
      setTodaySchedule(todayRes.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load timetable data.');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, semFilter, secFilter, dayFilter, searchQuery]);

  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  const handleOpenAddModal = (day = 'Monday', period = 1) => {
    setEditingEntry(null);
    const times = DEFAULT_PERIOD_TIMES[period] || { start: '09:00 AM', end: '09:50 AM' };
    setForm({
      department: deptFilter || 'CSE',
      academicYear: new Date().getFullYear(),
      semester: semFilter || 1,
      section: secFilter || 'A',
      day,
      period,
      startTime: times.start,
      endTime: times.end,
      subject: '',
      facultyName: '',
      classroom: '',
      classType: 'Theory'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (entry) => {
    setEditingEntry(entry);
    setForm({
      department: entry.department,
      academicYear: entry.academicYear,
      semester: entry.semester,
      section: entry.section,
      day: entry.day,
      period: entry.period,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subject: entry.subject,
      facultyName: entry.facultyName,
      classroom: entry.classroom,
      classType: entry.classType
    });
    setShowModal(true);
  };

  const handlePeriodChange = (p) => {
    const periodNum = Number(p);
    const times = DEFAULT_PERIOD_TIMES[periodNum] || { start: '09:00 AM', end: '09:50 AM' };
    setForm(prev => ({
      ...prev,
      period: periodNum,
      startTime: times.start,
      endTime: times.end
    }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');

      if (editingEntry) {
        await api.put(`/timetable/${editingEntry._id}`, form);
        setMessage('Timetable entry updated successfully!');
      } else {
        await api.post('/timetable', form);
        setMessage('Timetable entry created successfully!');
      }

      setShowModal(false);
      fetchTimetableData();
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving timetable entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timetable entry?')) return;
    try {
      setSaving(true);
      await api.delete(`/timetable/${id}`);
      setMessage('Timetable entry deleted successfully!');
      fetchTimetableData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete entry.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getClassTypeBadge = (type) => {
    if (type === 'Lab') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    if (type === 'Practical') return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
  };

  const isCurrentOngoingClass = (entry) => {
    if (!todaySchedule || todaySchedule.todayName !== entry.day) return false;
    return todaySchedule.currentClass && todaySchedule.currentClass._id === entry._id;
  };

  return (
    <div className="timetable-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Bar */}
      <div className="dashboard-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span>📅</span> Timetable &amp; Schedule Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            College weekly course timetable, room allocations, today's live classes, and lab hours tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🖨️ Print / Export PDF
          </button>

          {isAdmin && (
            <button className="btn btn-primary" onClick={() => handleOpenAddModal('Monday', 1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ➕ Create Timetable Entry
            </button>
          )}
        </div>
      </div>

      {message && <div className="auth-alert success no-print">{message}</div>}
      {error && <div className="auth-alert error no-print">{error}</div>}

      {/* Summary Metrics & Today Highlights Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={metricCardStyle}>
          <div style={{ fontSize: '1.5rem' }}>📚</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{metrics.totalClasses}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Classes / Week</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ fontSize: '1.5rem' }}>🔬</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{metrics.totalLabHours} Hrs</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Lab &amp; Practical Hours</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ fontSize: '1.5rem' }}>⏱️</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
            {todaySchedule ? todaySchedule.todayName : 'Today'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {todaySchedule?.currentClass ? `Current: ${todaySchedule.currentClass.subject}` : 'No Class Running Now'}
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ fontSize: '1.5rem' }}>🌱</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
            {todaySchedule ? todaySchedule.freePeriodsCount : 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Free Periods Today</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="dashboard-section-card no-print" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <label style={filterLabelStyle}>Department:</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="select-input" style={{ width: '100%' }}>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="IT">IT</option>
              <option value="AI&DS">AI&DS</option>
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Semester:</label>
            <select value={semFilter} onChange={(e) => setSemFilter(Number(e.target.value))} className="select-input" style={{ width: '100%' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Section:</label>
            <select value={secFilter} onChange={(e) => setSecFilter(e.target.value)} className="select-input" style={{ width: '100%' }}>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Day Filter:</label>
            <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="select-input" style={{ width: '100%' }}>
              <option value="">All Days (Mon-Sat)</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Search Subject/Faculty:</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0px' }} className="no-print">
        <button
          onClick={() => setActiveTab('weekly')}
          style={tabBtnStyle(activeTab === 'weekly')}
        >
          📅 Weekly Timetable Grid ({deptFilter} - Sem {semFilter} {secFilter})
        </button>

        <button
          onClick={() => setActiveTab('today')}
          style={tabBtnStyle(activeTab === 'today')}
        >
          ☀️ Today's Schedule ({todaySchedule ? todaySchedule.todayName : ''})
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : activeTab === 'today' ? (
        /* TODAY'S SCHEDULE VIEW */
        <div className="dashboard-section-card">
          <h2>☀️ Today's Classes ({todaySchedule ? todaySchedule.todayName : 'Today'})</h2>
          <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

          {todaySchedule && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Ongoing Class Highlight Banner */}
              {todaySchedule.currentClass ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
                  border: '2px solid #10b981',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                      ⚡ CURRENTLY ONGOING CLASS
                    </span>
                    <h3 style={{ margin: '0.2rem 0', fontSize: '1.4rem' }}>{todaySchedule.currentClass.subject}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Faculty: <strong>{todaySchedule.currentClass.facultyName}</strong> | Room: <strong>{todaySchedule.currentClass.classroom}</strong> | Period #{todaySchedule.currentClass.period}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                      {todaySchedule.currentClass.startTime} - {todaySchedule.currentClass.endTime}
                    </div>
                    <span className="badge badge-primary">{todaySchedule.currentClass.classType}</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem', background: 'var(--bg-muted, rgba(255,255,255,0.03))', borderRadius: '10px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  ℹ️ No class is currently ongoing at this exact moment.
                </div>
              )}

              {/* Today's All Classes Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Schedule Timeline for {todaySchedule.todayName}:</h4>
                {todaySchedule.todayClasses.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                    🎉 No classes scheduled for today!
                  </p>
                ) : (
                  todaySchedule.todayClasses.map((item) => {
                    const isCurrent = todaySchedule.currentClass && todaySchedule.currentClass._id === item._id;
                    const badgeStyle = getClassTypeBadge(item.classType);
                    return (
                      <div
                        key={item._id}
                        style={{
                          background: isCurrent ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
                          border: isCurrent ? '2px solid #10b981' : '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '10px',
                            background: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem'
                          }}>
                            P{item.period}
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1rem' }}>{item.subject}</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                              Faculty: {item.facultyName} | Room: {item.classroom}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.startTime} - {item.endTime}</div>
                            <span style={{ fontSize: '0.75rem', color: badgeStyle.color, fontWeight: 600 }}>{item.classType}</span>
                          </div>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button onClick={() => handleOpenEditModal(item)} className="action-btn edit">✏️</button>
                              <button onClick={() => handleDeleteEntry(item._id)} className="action-btn delete">🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* WEEKLY GRID VIEW */
        <div className="dashboard-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>📅 Weekly Timetable Grid ({deptFilter} - Semester {semFilter} Section {secFilter})</h2>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }} /> Theory</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} /> Practical</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} /> Lab</span>
            </div>
          </div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

          <div className="table-container">
            <table className="custom-table" style={{ borderCollapse: 'separate', borderSpacing: '4px' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px', textAlign: 'center' }}>Day / Period</th>
                  {PERIODS.map(p => {
                    const times = DEFAULT_PERIOD_TIMES[p];
                    return (
                      <th key={p} style={{ textAlign: 'center', minWidth: '120px' }}>
                        Period {p}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {times.start} - {times.end}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(dayName => (
                  <tr key={dayName}>
                    <td style={{ fontWeight: 700, textAlign: 'center', background: 'var(--bg-muted, rgba(255,255,255,0.03))' }}>
                      {dayName}
                    </td>

                    {PERIODS.map(periodNum => {
                      const entry = timetable.find(e => e.day === dayName && e.period === periodNum);
                      const isOngoing = entry && isCurrentOngoingClass(entry);
                      const badgeStyle = entry ? getClassTypeBadge(entry.classType) : null;

                      return (
                        <td key={periodNum} style={{ padding: '4px', verticalAlign: 'top', height: '100px' }}>
                          {entry ? (
                            <div style={{
                              background: isOngoing ? 'rgba(16,185,129,0.18)' : badgeStyle.bg,
                              border: isOngoing ? '2px solid #10b981' : `1px solid ${badgeStyle.border}`,
                              borderRadius: '8px',
                              padding: '0.5rem',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justify: 'space-between',
                              position: 'relative'
                            }}>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: badgeStyle.color, fontWeight: 700, textTransform: 'uppercase' }}>
                                  {entry.classType} {isOngoing && '• LIVE NOW'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px', lineHeight: 1.2 }}>
                                  {entry.subject}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  👨‍🏫 {entry.facultyName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  📍 {entry.classroom}
                                </div>
                              </div>

                              {isAdmin && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.2rem', marginTop: '4px' }} className="no-print">
                                  <button onClick={() => handleOpenEditModal(entry)} style={microBtnStyle}>✏️</button>
                                  <button onClick={() => handleDeleteEntry(entry._id)} style={microBtnStyle}>🗑️</button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              height: '100%', border: '1px dashed var(--border-color)', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem'
                            }}>
                              {isAdmin ? (
                                <button
                                  onClick={() => handleOpenAddModal(dayName, periodNum)}
                                  className="no-print"
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  + Assign P{periodNum}
                                </button>
                              ) : (
                                'Free'
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Add / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="dashboard-section-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
              {editingEntry ? '✏️ Edit Timetable Entry' : '➕ Assign New Timetable Period'}
            </h2>

            {error && <div className="auth-alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={filterLabelStyle}>Department *</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="select-input" style={{ width: '100%' }}>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="IT">IT</option>
                    <option value="AI&DS">AI&DS</option>
                  </select>
                </div>

                <div>
                  <label style={filterLabelStyle}>Academic Year *</label>
                  <input type="number" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: Number(e.target.value) })} className="search-input" style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={filterLabelStyle}>Semester *</label>
                  <select value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })} className="select-input" style={{ width: '100%' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={filterLabelStyle}>Section *</label>
                  <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="select-input" style={{ width: '100%' }}>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={filterLabelStyle}>Day *</label>
                  <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} className="select-input" style={{ width: '100%' }}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label style={filterLabelStyle}>Period Number *</label>
                  <select value={form.period} onChange={e => handlePeriodChange(e.target.value)} className="select-input" style={{ width: '100%' }}>
                    {PERIODS.map(p => <option key={p} value={p}>Period #{p}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={filterLabelStyle}>Start Time *</label>
                  <input type="text" placeholder="e.g. 09:00 AM" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required className="search-input" style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={filterLabelStyle}>End Time *</label>
                  <input type="text" placeholder="e.g. 09:50 AM" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required className="search-input" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={filterLabelStyle}>Subject Name *</label>
                <input type="text" placeholder="e.g. Data Structures & Algorithms" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required className="search-input" style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={filterLabelStyle}>Faculty Name *</label>
                  <input type="text" placeholder="e.g. Dr. R. Sharma" value={form.facultyName} onChange={e => setForm({ ...form, facultyName: e.target.value })} required className="search-input" style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={filterLabelStyle}>Classroom / Lab *</label>
                  <input type="text" placeholder="e.g. Lab 3 / LH-201" value={form.classroom} onChange={e => setForm({ ...form, classroom: e.target.value })} required className="search-input" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={filterLabelStyle}>Class Type *</label>
                <select value={form.classType} onChange={e => setForm({ ...form, classType: e.target.value })} className="select-input" style={{ width: '100%' }}>
                  {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingEntry ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const filterLabelStyle = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '0.25rem',
  display: 'block'
};

const metricCardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '1rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem'
};

const tabBtnStyle = (active) => ({
  background: 'none',
  border: 'none',
  borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  padding: '0.65rem 1rem',
  fontWeight: active ? 700 : 500,
  fontSize: '0.9rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s',
  marginBottom: '-2px'
});

const microBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.75rem',
  padding: '1px 3px'
};

export default TimetableManagement;
