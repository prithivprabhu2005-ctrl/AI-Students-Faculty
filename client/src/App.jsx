import React, { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';

// Lazy loading route components for performance optimization & code splitting
const Login = lazy(() => import('./components/login'));
const Signup = lazy(() => import('./components/Signup'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const Students = lazy(() => import('./components/Students'));
const AddEditStudent = lazy(() => import('./components/AddEditStudent'));
const Chatbot = lazy(() => import('./components/Chatbot'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const Unauthorized = lazy(() => import('./components/Unauthorized'));
const UserManagement = lazy(() => import('./components/UserManagement'));

// Module 2
const SubjectManagement = lazy(() => import('./components/SubjectManagement'));
const AttendanceManagement = lazy(() => import('./components/AttendanceManagement'));
const AssignmentManagement = lazy(() => import('./components/AssignmentManagement'));
const StudentAcademicView = lazy(() => import('./components/StudentAcademicView'));
const AcademicRecords = lazy(() => import('./components/AcademicRecords'));
const AcademicManagement = lazy(() => import('./components/AcademicManagement'));
const Administration = lazy(() => import('./components/Administration'));

// Module 3
const AdminAnalytics = lazy(() => import('./components/AdminAnalytics'));
const FacultyEvaluation = lazy(() => import('./components/FacultyEvaluation'));
const StudentPerformanceAnalytics = lazy(() => import('./components/StudentPerformanceAnalytics'));
const ReportsGenerator = lazy(() => import('./components/ReportsGenerator'));

// Module 4
const AIPrediction = lazy(() => import('./components/AIPrediction'));
const ReportsExport = lazy(() => import('./components/ReportsExport'));
const NotificationsView = lazy(() => import('./components/NotificationsView'));

// Module 5
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));
const AuditLogs = lazy(() => import('./components/AuditLogs'));
const GlobalSearch = lazy(() => import('./components/GlobalSearch'));
const BackupRestore = lazy(() => import('./components/BackupRestore'));
const ActivityDashboard = lazy(() => import('./components/ActivityDashboard'));

// Module 7: Advanced AI Features & Smart Automation
const AIInsights = lazy(() => import('./components/AIInsights'));
const AIComparison = lazy(() => import('./components/AIComparison'));

const StudentPortfolio = lazy(() => import('./components/StudentPortfolio'));
const DigitalStudentPassport = lazy(() => import('./components/DigitalStudentPassport'));
const TimetableManagement = lazy(() => import('./components/TimetableManagement'));
const EmailManagement = lazy(() => import('./components/EmailManagement'));

const adminMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', to: '/admin/dashboard' },
  { id: 'emails', label: 'Email System', icon: '📧', to: '/admin/emails' },
  { id: 'timetable', label: 'Timetable', icon: '📅', to: '/admin/timetable' },
  { id: 'passport', label: 'Digital Passport', icon: '📘', to: '/admin/passport' },
  { id: 'portfolio', label: 'Student Portfolio', icon: '💼', to: '/admin/portfolio' },
  { id: 'aiInsights', label: 'AI Intelligence', icon: '💡', to: '/admin/ai-insights' },
  { id: 'academicManagement', label: 'Academic Management', icon: '🎓', to: '/admin/academic-management' },
  { id: 'administration', label: 'Administration', icon: '🛠️', to: '/admin/administration' },
  { id: 'search', label: 'Global Search', icon: '🔍', to: '/admin/search' },
  { id: 'reportsExport', label: 'Reports & Export', icon: '📥', to: '/admin/reports-export' },
  { id: 'facultyEvaluation', label: 'Faculty Evaluation', icon: '🏆', to: '/admin/faculty-evaluation' },
  { id: 'profile', label: 'My Profile', icon: '👤', to: '/admin/profile' },
  { id: 'backup', label: 'Backup & Restore', icon: '💾', to: '/admin/backup' },
  { id: 'settings', label: 'Settings', icon: '⚙️', to: '/admin/settings' },
  { id: 'chatbot', label: 'NLQ Chatbot', icon: '💬', to: '/admin/chatbot' }
];

const studentMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', to: '/student/dashboard' },
  { id: 'timetable', label: 'Timetable', icon: '📅', to: '/student/timetable' },
  { id: 'passport', label: 'Digital Passport', icon: '📘', to: '/student/passport' },
  { id: 'portfolio', label: 'Student Portfolio', icon: '💼', to: '/student/portfolio' },
  { id: 'profile', label: 'My Profile', icon: '👤', to: '/student/profile' },
  { id: 'academicManagement', label: 'Academic Records', icon: '🎓', to: '/student/academic-management' },
  { id: 'aiInsights', label: 'AI Intelligence', icon: '💡', to: '/student/ai-insights' },
  { id: 'chatbot', label: 'Chatbot', icon: '💬', to: '/student/chatbot' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', to: '/student/notifications' }
];

const menuByRole = {
  admin: adminMenuItems,
  staff: adminMenuItems,
  faculty: adminMenuItems,
  student: studentMenuItems
};

const AppShell = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleMenu = menuByRole[user?.role] || menuByRole.admin;

  return (
    <div className="app-container">
      <Sidebar menuItems={roleMenu} user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Suspense fallback={<div className="full-page-loader"><Spinner /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

import { applyTheme, initThemeListener } from './utils/theme';

function App() {
  const { isAuthenticated, defaultRoute, loading } = useAuth();

  React.useEffect(() => {
    applyTheme();
    const cleanup = initThemeListener();
    return cleanup;
  }, []);

  if (loading) {
    return (
      <div className="full-page-loader">
        <Spinner />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="full-page-loader"><Spinner /></div>}>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Navigate to={defaultRoute} replace />} />
          <Route path="/signup" element={<Navigate to={defaultRoute} replace />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ── Admin Routes ── */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff', 'faculty']} />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/emails" element={<EmailManagement />} />
              <Route path="/admin/timetable" element={<TimetableManagement mode="admin" />} />
              <Route path="/admin/passport" element={<DigitalStudentPassport mode="admin" />} />
              <Route path="/admin/portfolio" element={<StudentPortfolio mode="admin" />} />
              <Route path="/admin/ai-insights" element={<AIInsights userRole="admin" />} />
              <Route path="/admin/ai-comparison" element={<AIComparison />} />
              <Route path="/admin/search" element={<GlobalSearch />} />
              <Route path="/admin/prediction" element={<AIPrediction userRole="admin" />} />
              <Route path="/admin/reports-export" element={<ReportsExport userRole="admin" />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/faculty-evaluation" element={<FacultyEvaluation userRole="admin" />} />
              <Route path="/admin/reports" element={<ReportsGenerator userRole="admin" />} />
              <Route path="/admin/academic-management" element={<AcademicManagement userRole="admin" />} />
              <Route path="/admin/students" element={<Navigate to="/admin/academic-management" replace />} />
              <Route path="/admin/students/new" element={<AddEditStudent mode="admin" />} />
              <Route path="/admin/students/:id/edit" element={<AddEditStudent mode="admin" />} />
              <Route path="/admin/subjects" element={<Navigate to="/admin/academic-management" replace />} />
              <Route path="/admin/academic-records" element={<Navigate to="/admin/academic-management" replace />} />
              <Route path="/admin/attendance" element={<Navigate to="/admin/academic-management" replace />} />
              <Route path="/admin/assignments" element={<Navigate to="/admin/academic-management" replace />} />
              <Route path="/admin/administration" element={<Administration userRole="admin" />} />
              <Route path="/admin/users" element={<Navigate to="/admin/administration" replace />} />
              <Route path="/admin/notifications" element={<Navigate to="/admin/administration" replace />} />
              <Route path="/admin/activity" element={<Navigate to="/admin/administration" replace />} />
              <Route path="/admin/audit-logs" element={<Navigate to="/admin/administration" replace />} />
              <Route path="/admin/profile" element={<Profile />} />
              <Route path="/admin/backup" element={<BackupRestore />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/chatbot" element={<Chatbot />} />

              {/* Legacy Staff & Faculty Redirects */}
              <Route path="/staff/*" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/faculty/*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

          {/* ── Student Routes ── */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<AppShell />}>
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/timetable" element={<TimetableManagement mode="student" />} />
              <Route path="/student/passport" element={<DigitalStudentPassport mode="student" />} />
              <Route path="/student/portfolio" element={<StudentPortfolio mode="student" />} />
              <Route path="/student/ai-insights" element={<AIInsights userRole="student" />} />
              <Route path="/student/ai-comparison" element={<AIComparison />} />
              <Route path="/student/search" element={<GlobalSearch />} />
              <Route path="/student/prediction" element={<AIPrediction userRole="student" />} />
              <Route path="/student/analytics" element={<StudentPerformanceAnalytics />} />
              <Route path="/student/academic-management" element={<AcademicManagement userRole="student" />} />
              <Route path="/student/academic-records" element={<Navigate to="/student/academic-management" replace />} />
              <Route path="/student/academic" element={<Navigate to="/student/academic-management" replace />} />
              <Route path="/student/notifications" element={<NotificationsView userRole="student" />} />
              <Route path="/student/profile" element={<Profile />} />
              <Route path="/student/chatbot" element={<Chatbot />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      )}
    </Suspense>
  );
}

export default App;
