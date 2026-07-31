import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

// ──────────────────────────────────────────────────────────────
// SubjectManagement Component
// Admin: full CRUD | Faculty: read-only view of their dept
// ──────────────────────────────────────────────────────────────
const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const emptyForm = {
  subjectCode: '',
  subjectName: '',
  department: '',
  semester: '',
  credits: '',
  faculty: ''
};

const SubjectManagement = ({ userRole }) => {
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Fetch subjects (and faculties for admin)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/academic/subjects');
      setSubjects(data.subjects || []);

      // Admin also fetches faculty list for dropdown
      if (userRole === 'admin') {
        const { data: fData } = await api.get('/academic/faculties');
        setFaculties(fData.faculties || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-clear messages after 4 seconds
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const openAddModal = () => {
    setEditingSubject(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setForm({
      subjectCode: subject.subjectCode || '',
      subjectName: subject.subjectName || '',
      department: subject.department || '',
      semester: subject.semester?.toString() || '',
      credits: subject.credits?.toString() || '',
      faculty: subject.faculty?._id || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Save (create or update)
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (!form.subjectCode.trim() || !form.subjectName.trim() || !form.department || !form.semester || !form.credits) {
      return setError('All fields except Faculty are required.');
    }

    try {
      setSaving(true);
      const payload = {
        subjectCode: form.subjectCode.toUpperCase(),
        subjectName: form.subjectName,
        department: form.department,
        semester: Number(form.semester),
        credits: Number(form.credits),
        faculty: form.faculty || null
      };

      if (editingSubject) {
        await api.put(`/academic/subjects/${editingSubject._id}`, payload);
        setSuccess('Subject updated successfully!');
      } else {
        await api.post('/academic/subjects', payload);
        setSuccess('Subject added successfully!');
      }

      closeModal();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving subject.');
    } finally {
      setSaving(false);
    }
  };

  // Delete subject
  const handleDelete = async (id) => {
    try {
      await api.delete(`/academic/subjects/${id}`);
      setSuccess('Subject deleted successfully.');
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting subject.');
    }
  };

  // Filtered subjects
  const filtered = subjects.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || s.subjectCode?.toLowerCase().includes(q) || s.subjectName?.toLowerCase().includes(q);
    const matchDept = !filterDept || s.department === filterDept;
    return matchSearch && matchDept;
  });

  if (loading) return <div className="full-page-loader"><Spinner /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>📚 Subject Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {userRole === 'admin' ? 'Create and manage subjects across all departments.' : 'View subjects assigned to your department.'}
        </p>
      </div>

      {/* Alerts */}
      {error && <div className="alert-error" style={alertStyle('error')}>{error}</div>}
      {success && <div className="alert-success" style={alertStyle('success')}>{success}</div>}

      {/* Controls */}
      <div className="students-controls">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div className="search-input-wrapper" style={{ maxWidth: '280px' }}>
            <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              placeholder="Search code or name…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {userRole === 'admin' && (
          <button className="btn btn-primary" onClick={openAddModal}>
            ➕ Add Subject
          </button>
        )}
      </div>

      {/* Summary badge */}
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text-main)' }}>{filtered.length}</strong> of {subjects.length} subjects
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Semester</th>
              <th>Credits</th>
              <th>Assigned Faculty</th>
              <th>Status</th>
              {userRole === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={userRole === 'admin' ? 8 : 7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No subjects found.
              </td></tr>
            ) : filtered.map(subject => (
              <tr key={subject._id}>
                <td><span className="badge badge-primary">{subject.subjectCode}</span></td>
                <td style={{ fontWeight: 500 }}>{subject.subjectName}</td>
                <td>{subject.department}</td>
                <td>Sem {subject.semester}</td>
                <td>{subject.credits} Credits</td>
                <td style={{ color: subject.faculty ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {subject.faculty?.name || <em>Unassigned</em>}
                </td>
                <td>
                  <span className={`badge ${subject.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {subject.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {userRole === 'admin' && (
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="action-btn edit" title="Edit" onClick={() => openEditModal(subject)}>
                        ✏️
                      </button>
                      <button className="action-btn delete" title="Delete" onClick={() => setDeleteConfirm(subject)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.3rem', fontWeight: 700 }}>
                {editingSubject ? '✏️ Edit Subject' : '➕ Add Subject'}
              </h2>
              <button style={closeBtn} onClick={closeModal}>✕</button>
            </div>

            {error && <div style={alertStyle('error')}>{error}</div>}

            <form onSubmit={handleSave}>
              <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Subject Code *</label>
                  <input
                    className="form-control"
                    name="subjectCode"
                    value={form.subjectCode}
                    onChange={handleChange}
                    placeholder="e.g. CS301"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="form-group">
                  <label>Subject Name *</label>
                  <input
                    className="form-control"
                    name="subjectName"
                    value={form.subjectName}
                    onChange={handleChange}
                    placeholder="e.g. Data Structures"
                  />
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <select className="form-control" name="department" value={form.department} onChange={handleChange}>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester *</label>
                  <select className="form-control" name="semester" value={form.semester} onChange={handleChange}>
                    <option value="">Select Semester</option>
                    {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Credits *</label>
                  <select className="form-control" name="credits" value={form.credits} onChange={handleChange}>
                    <option value="">Select Credits</option>
                    {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign Faculty (optional)</label>
                  <select className="form-control" name="faculty" value={form.faculty} onChange={handleChange}>
                    <option value="">Unassigned</option>
                    {faculties.map(f => (
                      <option key={f._id} value={f._id}>{f.name} — {f.department}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : (editingSubject ? 'Update Subject' : 'Add Subject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: '420px' }}>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', marginBottom: '1rem' }}>🗑️ Delete Subject</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>
                {deleteConfirm.subjectCode} – {deleteConfirm.subjectName}
              </strong>? This cannot be undone.
            </p>
            <div className="form-actions" style={{ marginTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={() => handleDelete(deleteConfirm._id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Shared Styles ──
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)'
};

const modalStyle = {
  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
  borderRadius: '16px', padding: '2rem', width: '100%',
  maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
};

const closeBtn = {
  background: 'none', border: 'none', color: 'var(--text-muted)',
  cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1,
  padding: '0.25rem 0.5rem', borderRadius: '6px'
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

export default SubjectManagement;
