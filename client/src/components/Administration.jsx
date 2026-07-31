import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import Students from './Students';
import ApproveStudents from './ApproveStudents';

// ──────────────────────────────────────────────────────────────
// Administration Component (3 Core Sections)
//   Section A: Users (Create/Edit Admin accounts, Reset Password, Status Toggle)
//   Section B: Students (Add/Edit/Delete Student, Profile, CGPA, Marks, Attendance)
//   Section C: Approve Students (Approve or Reject Self-Registered Student Accounts)
// ──────────────────────────────────────────────────────────────

const Administration = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  // Sections: 'users' | 'students' | 'approve'
  const [activeSection, setActiveSection] = useState('users');

  if (!isAdmin) {
    return (
      <div style={cardStyle}>
        <h3>🛡️ Access Restricted</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Administration management is restricted to Administrators only.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>🛠️ Administration Center</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage admin system user accounts, student profiles, pending registrations, and academic records.
        </p>
      </div>

      {/* Top-Level Navigation Tabs */}
      <div style={tabContainerStyle}>
        <button
          onClick={() => setActiveSection('users')}
          style={mainTabBtn(activeSection === 'users')}
        >
          🛡️ Admin Users
        </button>
        <button
          onClick={() => setActiveSection('students')}
          style={mainTabBtn(activeSection === 'students')}
        >
          🎓 Student Records
        </button>
        <button
          onClick={() => setActiveSection('approve')}
          style={mainTabBtn(activeSection === 'approve')}
        >
          ⏳ Approve Students
        </button>
      </div>

      {/* Main Content Area */}
      <div>
        {activeSection === 'users' && (
          <UserManagement />
        )}

        {activeSection === 'students' && (
          <Students mode="admin" />
        )}

        {activeSection === 'approve' && (
          <ApproveStudents />
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
  padding: '2rem',
  boxShadow: 'var(--shadow)'
};

export default Administration;
