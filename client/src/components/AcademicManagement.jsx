import React, { useState } from 'react';
import Students from './Students';
import SubjectManagement from './SubjectManagement';
import AcademicRecords from './AcademicRecords';

// ──────────────────────────────────────────────────────────────
// AcademicManagement Component
// Merges Students, Subjects, and Academic Records into a single
// unified module with three tabs:
//   1. Students
//   2. Subjects
//   3. Academic Records
// ──────────────────────────────────────────────────────────────

const AcademicManagement = ({ userRole }) => {
  // Default tab based on role (Student defaults to Academic Records)
  const [activeTab, setActiveTab] = useState(
    userRole === 'student' ? 'records' : 'students'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>🎓 Academic Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {userRole === 'admin' && 'Centralized hub for managing students, subjects, attendance, and assignment performance.'}
          {userRole === 'faculty' && 'Manage your students, subjects, attendance records, and assignment marks.'}
          {userRole === 'student' && 'View your academic records, attendance log, and assignment performance.'}
        </p>
      </div>

      {/* Top Tab Bar */}
      <div style={tabContainerStyle}>
        {userRole !== 'student' && (
          <button
            onClick={() => setActiveTab('students')}
            style={tabBtnStyle(activeTab === 'students')}
          >
            🎓 Students
          </button>
        )}
        {userRole !== 'student' && (
          <button
            onClick={() => setActiveTab('subjects')}
            style={tabBtnStyle(activeTab === 'subjects')}
          >
            📚 Subjects
          </button>
        )}
        <button
          onClick={() => setActiveTab('records')}
          style={tabBtnStyle(activeTab === 'records')}
        >
          📊 Academic Records
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'students' && userRole !== 'student' && (
          <Students mode={userRole === 'faculty' ? 'faculty' : 'admin'} />
        )}

        {activeTab === 'subjects' && userRole !== 'student' && (
          <SubjectManagement userRole={userRole} />
        )}

        {activeTab === 'records' && (
          <AcademicRecords userRole={userRole} />
        )}
      </div>
    </div>
  );
};

// ── Inline Styles ──
const tabContainerStyle = {
  display: 'flex',
  gap: '1rem',
  borderBottom: '2px solid var(--border-color)',
  paddingBottom: '0px'
};

const tabBtnStyle = (active) => ({
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

export default AcademicManagement;
