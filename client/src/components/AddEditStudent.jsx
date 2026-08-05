import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from './Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SUBJECTS = [
  { key: 'english', label: 'English', subjectName: 'English' },
  { key: 'mathematics', label: 'Mathematics', subjectName: 'Mathematics' },
  { key: 'programming', label: 'Programming', subjectName: 'Programming' },
  { key: 'database', label: 'Database', subjectName: 'Database' },
  { key: 'operatingSystems', label: 'Operating Systems', subjectName: 'Operating Systems' },
  { key: 'computerNetworks', label: 'Computer Networks', subjectName: 'Computer Networks' }
];

const AddEditStudent = ({ mode = 'admin' }) => {
  const navigate = useNavigate();
  const { id: editingStudentId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [subjectsList, setSubjectsList] = useState(DEFAULT_SUBJECTS);
  const [formData, setFormData] = useState({
    studentId: '',
    registerNumber: '',
    name: '',
    gender: 'Male',
    department: 'CSE',
    batchYear: 2023,
    academicYear: 2,
    semester: 3,
    section: 'A',
    dob: '',
    phone: '',
    email: '',
    address: '',
    marks: {}
  });

  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
  const isFacultyMode = mode === 'faculty';
  const isEditing = Boolean(editingStudentId);

  useEffect(() => {
    const loadSubjectsAndStudent = async () => {
      try {
        setFetching(true);
        // Fetch active subjects dynamically from MongoDB
        let dbSubjects = [];
        try {
          const { data: subRes } = await api.get('/academic/subjects');
          dbSubjects = subRes.subjects || [];
        } catch (subErr) {
          console.warn('Could not load subjects from DB, using default list:', subErr);
        }

        // Build combined subjects list: Default subjects first, followed by new MongoDB subjects without duplicates
        const combined = [...DEFAULT_SUBJECTS];
        const existingNames = new Set(DEFAULT_SUBJECTS.map(s => s.subjectName.toLowerCase()));

        dbSubjects.forEach(s => {
          const name = (s.subjectName || s.subjectCode || '').trim();
          if (name && !existingNames.has(name.toLowerCase())) {
            existingNames.add(name.toLowerCase());
            combined.push({
              key: s.subjectName || s.subjectCode,
              label: s.subjectCode ? `${s.subjectCode} - ${s.subjectName}` : s.subjectName,
              subjectName: s.subjectName,
              subjectCode: s.subjectCode,
              department: s.department,
              semester: s.semester,
              _id: s._id
            });
          }
        });

        setSubjectsList(combined);

        const initialMarks = {};
        combined.forEach(s => {
          initialMarks[s.key] = { internal: 0, external: 0 };
        });

        if (editingStudentId) {
          const response = await api.get(`/students/${editingStudentId}`);
          const student = response.data;
          
          const formattedDob = student.dob ? new Date(student.dob).toISOString().split('T')[0] : '';
          
          const loadedMarks = {};
          combined.forEach(s => {
            const key = s.key;
            const existing = student.marks?.[key] || 
                             student.marks?.[s.subjectName] || 
                             student.marks?.[s.subjectCode] || 
                             student.marks?.[s._id] || 
                             { internal: 0, external: 0 };
            const existingVal = typeof existing === 'number' ? { internal: 0, external: existing } : existing;
            loadedMarks[key] = {
              internal: existingVal.internal || 0,
              external: existingVal.external || 0
            };
          });

          setFormData({
            studentId: student.studentId || '',
            registerNumber: student.registerNumber || '',
            name: student.name || '',
            gender: student.gender || 'Male',
            department: student.department || 'CSE',
            batchYear: student.batchYear || 2023,
            academicYear: student.academicYear || 2,
            semester: student.semester || 3,
            section: student.section || 'A',
            dob: formattedDob,
            phone: student.phone || '',
            email: student.email || '',
            address: student.address || '',
            marks: loadedMarks
          });
        } else {
          setFormData(prev => ({
            ...prev,
            marks: initialMarks
          }));
        }
      } catch (err) {
        console.error('Error fetching subjects or student details:', err);
        alert('Failed to load student details.');
        if (editingStudentId) {
          navigate(isFacultyMode ? '/faculty/students' : '/admin/students');
        }
      } finally {
        setFetching(false);
      }
    };

    loadSubjectsAndStudent();
  }, [editingStudentId, isFacultyMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'batchYear' || name === 'academicYear' || name === 'semester' 
        ? Number(value) 
        : value
    }));
  };

  const handleMarkChange = (subjectKey, type, value) => {
    const numericVal = Math.min(type === 'internal' ? 40 : 60, Math.max(0, Number(value) || 0));
    setFormData(prev => ({
      ...prev,
      marks: {
        ...prev.marks,
        [subjectKey]: {
          ...prev.marks[subjectKey],
          [type]: numericVal
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingStudentId) {
        const payload = isFacultyMode ? { marks: formData.marks } : formData;
        await api.put(`/students/${editingStudentId}`, payload);
        alert(isFacultyMode ? 'Student marks updated successfully!' : 'Student details updated successfully!');
      } else {
        await api.post('/students', formData);
        alert('Student added successfully!');
      }
      navigate(isFacultyMode ? '/faculty/students' : '/admin/students');
    } catch (err) {
      console.error('Error submitting form:', err);
      alert(err.response?.data?.message || 'An error occurred while saving student.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Spinner />;

  return (
    <div className="dashboard-section-card">
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>
          {isFacultyMode
            ? 'Update Student Marks'
            : editingStudentId
              ? 'Edit Student Details'
              : 'Add New Student Record'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {isFacultyMode
            ? `Update marks for students in ${user?.department}. Grades and ranks will be recalculated automatically.`
            : 'Fill in student info and marks. Grades and ranks will be calculated automatically.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        {/* Section 1: Personal Information */}
        {!isFacultyMode && (
        <div className="form-grid">
          <div className="form-section-title">Personal Details</div>

          <div className="form-group">
            <label htmlFor="studentId">Student ID {editingStudentId ? '' : '(Auto-generated)'}</label>
            <input
              type="text"
              id="studentId"
              name="studentId"
              className="form-control"
              value={formData.studentId}
              onChange={handleChange}
              placeholder={editingStudentId ? 'e.g. STU001' : 'Auto-generated (e.g. STU001)'}
              disabled={!editingStudentId && false}
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerNumber">Register Number (e.g. 23CSE102)</label>
            <input
              type="text"
              id="registerNumber"
              name="registerNumber"
              className="form-control"
              required
              disabled={!!editingStudentId}
              value={formData.registerNumber}
              onChange={handleChange}
              placeholder="e.g. 23CSE102"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Arun Kumar"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              className="filter-select"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              name="department"
              className="filter-select"
              value={formData.department}
              onChange={handleChange}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="batchYear">Batch Year</label>
            <input
              type="number"
              id="batchYear"
              name="batchYear"
              className="form-control"
              required
              value={formData.batchYear}
              onChange={handleChange}
              placeholder="e.g. 2023"
            />
          </div>

          <div className="form-group">
            <label htmlFor="academicYear">Academic Year</label>
            <input
              type="number"
              id="academicYear"
              name="academicYear"
              className="form-control"
              required
              min="1"
              max="4"
              value={formData.academicYear}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="semester">Semester</label>
            <input
              type="number"
              id="semester"
              name="semester"
              className="form-control"
              required
              min="1"
              max="8"
              value={formData.semester}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="section">Section</label>
            <input
              type="text"
              id="section"
              name="section"
              className="form-control"
              required
              value={formData.section}
              onChange={handleChange}
              placeholder="e.g. A"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="dob">Date of Birth</label>
            <input
              type="date"
              id="dob"
              name="dob"
              className="form-control"
              required
              value={formData.dob}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="form-control"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9840123456"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. arun.kumar@college.edu"
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              className="form-control"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. 12, Anna Salai, Chennai - 600010"
            />
          </div>
        </div>
        )}

        {/* Section 2: Subject Marks */}
        <div>
          <div className="form-section-title">Academic Subject Marks</div>
          {subjectsList.length === 0 ? (
            <div style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No subjects available. Please add subjects from Subject Management.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
              {subjectsList.map(subject => {
                const subKey = subject.key;
                const m = formData.marks[subKey] || { internal: 0, external: 0 };
                const displayName = subject.label || subject.subjectName || subject.key;
                return (
                  <div
                    key={subject._id || subKey}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary)' }}>
                      {displayName}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Internal (max 40)</label>
                        <input
                          type="number"
                          min="0"
                          max="40"
                          className="form-control"
                          value={m.internal || 0}
                          onChange={(e) => handleMarkChange(subKey, 'internal', e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>External (max 60)</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          className="form-control"
                          value={m.external || 0}
                          onChange={(e) => handleMarkChange(subKey, 'external', e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal: <b>{(m.internal || 0) + (m.external || 0)}</b></span>
                      <span>Pass $\ge$ 50</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isFacultyMode ? '/faculty/students' : '/admin/students')}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? 'Saving...'
              : isFacultyMode
                ? 'Update Marks'
                : isEditing
                  ? 'Update Student Record'
                  : 'Create Student Record'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditStudent;
