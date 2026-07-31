import { useEffect, useState } from 'react';
import Spinner from './Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/students', {
          params: {
            page: 1,
            limit: 1
          }
        });

        const profile = response.data.students?.[0] || null;
        setStudent(profile);
        setError('');
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Failed to load your student profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="dashboard-section-card">
        <h2>Student Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="dashboard-section-card">
        <h2>Student Dashboard</h2>
        <p>No academic record is linked to your account yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <p>Welcome back, {user?.name}. Here is your profile and marks summary.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Register Number</div>
          <div className="metric-value" style={{ fontSize: '1.25rem' }}>{student.registerNumber}</div>
          <div className="metric-footer">{student.department}</div>
        </div>
        <div className="metric-card success">
          <div className="metric-label">Total Marks</div>
          <div className="metric-value">{student.totalMarks}</div>
          <div className="metric-footer">Out of 600</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-label">CGPA</div>
          <div className="metric-value">{student.cgpa}</div>
          <div className="metric-footer">Current semester performance</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">College Rank</div>
          <div className="metric-value">#{student.rank}</div>
          <div className="metric-footer">{student.result}</div>
        </div>
      </div>

      <div className="dashboard-section-card">
        <h2>Profile Details</h2>
        <div className="student-info-grid">
          <div className="student-info-item">
            <span className="student-info-label">Name</span>
            <span className="student-info-value">{student.name}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Student ID</span>
            <span className="student-info-value">{student.studentId}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Email</span>
            <span className="student-info-value">{student.email}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Phone</span>
            <span className="student-info-value">{student.phone}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Semester</span>
            <span className="student-info-value">Semester {student.semester}</span>
          </div>
          <div className="student-info-item">
            <span className="student-info-label">Section</span>
            <span className="student-info-value">{student.section}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section-card">
        <h2>Marks Overview</h2>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Internal</th>
                <th>External</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(student.marks).map(([key, subject]) => (
                <tr key={key}>
                  <td>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</td>
                  <td>{subject.internal}</td>
                  <td>{subject.external}</td>
                  <td>{subject.total}</td>
                  <td>{subject.grade}</td>
                  <td>
                    <span className={`badge ${subject.result === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                      {subject.result}
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

export default StudentDashboard;
