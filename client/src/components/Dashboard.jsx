import { useEffect, useState } from 'react';
import Spinner from './Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const [response, portfolioRes, todayRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/portfolio/summary'),
          api.get('/timetable/today')
        ]);
        setStats(response.data);
        setPortfolioSummary(portfolioRes.data.summary);
        setTodaySchedule(todayRes.data || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.response?.data?.message || 'Failed to fetch dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="dashboard-section-card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  const {
    totalStudents,
    passPercentage,
    averageCgpa,
    collegeTopper,
    highestMarks,
    lowestMarks,
    departmentStats,
    departmentToppers,
    scopeLabel
  } = stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="dashboard-header">
        <h1>{user?.role === 'admin' ? 'Admin Dashboard' : 'Faculty Dashboard'}</h1>
        <p>Real-time analytics for the {scopeLabel || 'college'} student records</p>
      </div>

      {/* Top Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Students</div>
          <div className="metric-value">{totalStudents}</div>
          <div className="metric-footer">Active enrollment</div>
        </div>

        <div className="metric-card success">
          <div className="metric-label">Pass Percentage</div>
          <div className="metric-value">{passPercentage}%</div>
          <div className="metric-footer">Students with 0 arrears</div>
        </div>

        <div className="metric-card warning">
          <div className="metric-label">Average CGPA</div>
          <div className="metric-value">{averageCgpa}</div>
          <div className="metric-footer">Out of 10.00 scale</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">{user?.role === 'admin' ? 'College Topper' : 'Department Topper'}</div>
          <div className="metric-value" style={{ fontSize: '1.25rem', marginTop: '0.5rem', fontWeight: 600 }}>
            {collegeTopper ? collegeTopper.name : 'N/A'}
          </div>
          <div className="metric-footer">
            CGPA: <span>{collegeTopper ? collegeTopper.cgpa : 'N/A'}</span> ({collegeTopper ? collegeTopper.department : ''})
          </div>
        </div>
      </div>

      {/* Student Portfolio Summary Cards */}
      {portfolioSummary && (
        <div className="dashboard-section-card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💼 Student Portfolio & Skills Summary
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div style={portfolioMetricCardStyle}>
              <div style={{ fontSize: '1.5rem' }}>🏆</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{portfolioSummary.totalCertifications}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Certifications</div>
            </div>
            <div style={portfolioMetricCardStyle}>
              <div style={{ fontSize: '1.5rem' }}>⚡</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{portfolioSummary.totalSkills}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unique Skills</div>
            </div>
            <div style={portfolioMetricCardStyle}>
              <div style={{ fontSize: '1.5rem' }}>💻</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{portfolioSummary.totalProjects}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Projects</div>
            </div>
            <div style={portfolioMetricCardStyle}>
              <div style={{ fontSize: '1.5rem' }}>🏅</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{portfolioSummary.totalSportsAchievements}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sports Medals</div>
            </div>
            <div style={portfolioMetricCardStyle}>
              <div style={{ fontSize: '1.5rem' }}>🏢</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{portfolioSummary.totalInternships}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Internships</div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Timetable & Class Schedule Widget */}
      {todaySchedule && (
        <div className="dashboard-section-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📅 Today's Class Schedule ({todaySchedule.todayName})
            </h2>
            <span className="badge badge-primary">
              {todaySchedule.todayClasses?.length || 0} Classes Scheduled
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ ...portfolioMetricCardStyle, borderColor: todaySchedule.currentClass ? '#10b981' : 'var(--border-color)', background: todaySchedule.currentClass ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT CLASS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: todaySchedule.currentClass ? '#10b981' : 'var(--text-main)', marginTop: '2px' }}>
                {todaySchedule.currentClass ? todaySchedule.currentClass.subject : 'None Now'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {todaySchedule.currentClass ? `${todaySchedule.currentClass.startTime} - ${todaySchedule.currentClass.endTime} (${todaySchedule.currentClass.classroom})` : 'Free Period'}
              </div>
            </div>

            <div style={portfolioMetricCardStyle}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>NEXT UPCOMING CLASS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                {todaySchedule.nextClass ? todaySchedule.nextClass.subject : 'No More Classes'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {todaySchedule.nextClass ? `${todaySchedule.nextClass.startTime} (${todaySchedule.nextClass.classroom})` : 'Done for Today'}
              </div>
            </div>

            <div style={portfolioMetricCardStyle}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>REMAINING CLASSES</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {todaySchedule.remainingClassesCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Classes Left Today</div>
            </div>

            <div style={portfolioMetricCardStyle}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>FREE PERIODS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
                {todaySchedule.freePeriodsCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Periods Free</div>
            </div>
          </div>
        </div>
      )}

      {/* Mid Aggregations Table */}
      <div className="dashboard-details-grid">
        {/* Left Side: Department Wise Performance */}
        <div className="dashboard-section-card">
          <h2>Department Performance Analysis</h2>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Student Count</th>
                  <th>Avg CGPA</th>
                  <th>Pass Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 600 }}>{dept.department}</td>
                    <td>{dept.count}</td>
                    <td>{dept.avgCgpa}</td>
                    <td>{dept.passPercentage}%</td>
                    <td>
                      <span className={`badge ${dept.passPercentage >= 75 ? 'badge-success' : 'badge-warning'}`}>
                        {dept.passPercentage >= 75 ? 'Optimal' : 'Needs Review'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Toppers & Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="dashboard-section-card">
            <h2>Department Toppers</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {departmentToppers.map((topper, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{topper.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{topper.registerNumber} | {topper.department}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>CGPA: {topper.cgpa}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{topper.totalMarks}/600</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Highs and Lows */}
          <div className="dashboard-section-card">
            <h2>College Score Highlights</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Highest Score:</span>
                <span style={{ fontWeight: 600 }}>
                  {highestMarks ? `${highestMarks.name} (${highestMarks.totalMarks}/600)` : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lowest Score:</span>
                <span style={{ fontWeight: 600 }}>
                  {lowestMarks ? `${lowestMarks.name} (${lowestMarks.totalMarks}/600)` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const portfolioMetricCardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  padding: '0.85rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.2rem'
};

export default Dashboard;
