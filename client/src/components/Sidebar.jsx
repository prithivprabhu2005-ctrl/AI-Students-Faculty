import { NavLink } from 'react-router-dom';

const Sidebar = ({ menuItems, user, onLogout }) => {
  const roleLabel = user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : '';

  return (
    <aside className="sidebar">
      {/* Fixed Header / Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">🎓</div>
        <div className="sidebar-title">EduBot Academic</div>
      </div>

      {/* Scrollable Navigation Area */}
      <div className="sidebar-nav-container">
        <div className="sidebar-user-card">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-meta">{roleLabel}</div>
          <div className="sidebar-user-meta">{user?.email}</div>
          {user?.department && <div className="sidebar-user-tag">{user.department}</div>}
        </div>
        <ul className="sidebar-menu">
          {menuItems.map(item => (
            <li key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <span className="menu-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Fixed Footer / Logout */}
      <div className="sidebar-footer">
        <button type="button" className="btn btn-secondary sidebar-logout-btn" onClick={onLogout}>
          Logout
        </button>
        <p>Vite + Express + MongoDB</p>
        <p>JWT Authentication</p>
      </div>
    </aside>
  );
};

export default Sidebar;
