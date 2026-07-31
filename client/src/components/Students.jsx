import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from './Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Students = ({ mode = 'admin' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';
  const canAddStudent = isAdmin;
  const canDeleteStudent = isAdmin;
  const canEditStudent = isAdmin || isFaculty;
  const canFilterDepartment = isAdmin;

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students', {
        params: {
          page,
          limit: 10,
          search: search.trim(),
          department: canFilterDepartment ? department : undefined
        }
      });
      setStudents(response.data.students);
      setTotalPages(response.data.totalPages);
      setTotalStudents(response.data.totalStudents);
      setError(null);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.response?.data?.message || 'Failed to fetch students list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset page to 1 when search or department filter changes
    setPage(1);
  }, [search, department]);

  useEffect(() => {
    fetchStudents();
  }, [page, search, department]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete student "${name}"?`)) {
      try {
        await api.delete(`/students/${id}`);
        alert('Student deleted successfully.');
        fetchStudents();
      } catch (err) {
        console.error('Error deleting student:', err);
        alert(err.response?.data?.message || 'Error deleting student');
      }
    }
  };

  const handleRowClick = async (id) => {
    try {
      const response = await api.get(`/students/${id}`);
      setSelectedStudent(response.data);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching student details:', err);
      alert('Error fetching student details.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{isFaculty ? 'Department Students' : 'Student Directory'}</h1>
          <p>
            {isFaculty
              ? `View and update marks for students in ${user?.department} (${totalStudents} records)`
              : `Manage and inspect academic records for all students (${totalStudents} records)`}
          </p>
        </div>
        {canAddStudent && (
          <button className="btn btn-primary" onClick={() => navigate('/admin/students/new')}>
            ➕ Add New Student
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="students-controls">
        <div className="search-input-wrapper">
          <svg className="search-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or register number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {canFilterDepartment ? (
          <select
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        ) : (
          <div className="filter-pill">{user?.department}</div>
        )}
      </div>

      {/* Students Table */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="dashboard-section-card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          <p>{error}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="dashboard-section-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <p>No student records found matching the filters.</p>
        </div>
      ) : (
        <div className="dashboard-section-card" style={{ padding: '1rem' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Reg. No</th>
                  <th>Name</th>
                  <th>Dept</th>
                  <th>CGPA</th>
                  <th>Arrears</th>
                  <th>Result</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      #{student.rank}
                    </td>
                    <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: 500 }}>
                      {student.registerNumber}
                    </td>
                    <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: 500 }}>
                      {student.name}
                    </td>
                    <td onClick={() => handleRowClick(student._id)}>{student.department}</td>
                    <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: 700 }}>
                      {student.cgpa.toFixed(2)}
                    </td>
                    <td onClick={() => handleRowClick(student._id)}>
                      {student.arrears > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{student.arrears}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td onClick={() => handleRowClick(student._id)}>
                      <span className={`badge ${student.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                        {student.result}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {canEditStudent && (
                          <button
                            className="action-btn edit"
                            title={isFaculty ? 'Update Marks' : 'Edit Student'}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                isFaculty
                                  ? `/faculty/students/${student._id}/edit-marks`
                                  : `/admin/students/${student._id}/edit`
                              );
                            }}
                          >
                            ✏️
                          </button>
                        )}
                        {canDeleteStudent && (
                          <button
                            className="action-btn delete"
                            title="Delete Student"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(student._id, student.name);
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination-wrapper">
            <div>
              Showing page <b>{page}</b> of <b>{totalPages}</b> ({totalStudents} total records)
            </div>
            <div className="pagination-buttons">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                ◀ Previous
              </button>
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Academic Profile</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="student-info-grid">
                <div className="student-info-item">
                  <span className="student-info-label">Register Number</span>
                  <span className="student-info-value">{selectedStudent.registerNumber}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Student ID</span>
                  <span className="student-info-value">{selectedStudent.studentId}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Name</span>
                  <span className="student-info-value">{selectedStudent.name}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Gender</span>
                  <span className="student-info-value">{selectedStudent.gender}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Department</span>
                  <span className="student-info-value">{selectedStudent.department}</span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Batch & Semester</span>
                  <span className="student-info-value">
                    Batch {selectedStudent.batchYear} | Sem {selectedStudent.semester} (Sec {selectedStudent.section})
                  </span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Date of Birth</span>
                  <span className="student-info-value">
                    {new Date(selectedStudent.dob).toLocaleDateString()}
                  </span>
                </div>
                <div className="student-info-item">
                  <span className="student-info-label">Contact</span>
                  <span className="student-info-value">
                    {selectedStudent.phone} <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedStudent.email}</span>
                  </span>
                </div>
                <div className="student-info-item" style={{ gridColumn: 'span 2' }}>
                  <span className="student-info-label">Address</span>
                  <span className="student-info-value">{selectedStudent.address}</span>
                </div>
              </div>

              {/* Marks Card */}
              <div className="student-marks-block">
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>Subject Marks Report</h3>
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Internal (40)</th>
                        <th>External (60)</th>
                        <th>Total (100)</th>
                        <th>Grade</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(selectedStudent.marks).map((key) => {
                        const sub = selectedStudent.marks[key];
                        // Capitalize subject key
                        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                        return (
                          <tr key={key}>
                            <td style={{ fontWeight: 500 }}>{label}</td>
                            <td>{sub.internal}</td>
                            <td>{sub.external}</td>
                            <td style={{ fontWeight: 600 }}>{sub.total}</td>
                            <td style={{ fontWeight: 700, color: sub.grade === 'F' ? 'var(--danger)' : 'var(--primary)' }}>
                              {sub.grade}
                            </td>
                            <td>
                              <span className={`badge ${sub.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                                {sub.result}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Aggregated totals */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', textAlign: 'center' }}>
                <div>
                  <div className="student-info-label">Total Marks</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedStudent.totalMarks}/600</div>
                </div>
                <div>
                  <div className="student-info-label">Percentage</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedStudent.percentage}%</div>
                </div>
                <div>
                  <div className="student-info-label">CGPA</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedStudent.cgpa}</div>
                </div>
                <div>
                  <div className="student-info-label">College Rank</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>#{selectedStudent.rank}</div>
                </div>
              </div>
            </div>
            <div className="modal-header" style={{ borderTop: '1px solid var(--border-color)', borderBottom: 'none', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
