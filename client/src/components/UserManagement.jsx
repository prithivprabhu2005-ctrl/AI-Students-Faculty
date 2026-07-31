import { useEffect, useState } from 'react';
import api from '../services/api';
import Spinner from './Spinner';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'admin',
  department: 'CSE',
  registerNumber: '',
  staffId: '',
  isActive: true
};

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users', {
        params: { search: search.trim() || undefined }
      });
      setUsers(response.data.users || []);
      setError('');
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        const payload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          department: formData.role === 'admin' ? '' : formData.department,
          registerNumber: formData.role === 'student' ? formData.registerNumber : '',
          staffId: formData.role === 'faculty' ? formData.staffId : '',
          isActive: formData.isActive,
          ...(formData.password ? { password: formData.password } : {})
        };

        await api.put(`/users/${editingId}`, payload);
        alert('User updated successfully.');
      } else {
        await api.post('/auth/register', {
          ...formData,
          department: formData.role === 'admin' ? '' : formData.department,
          registerNumber: formData.role === 'student' ? formData.registerNumber : '',
          staffId: formData.role === 'faculty' ? formData.staffId : ''
        });
        alert('User created successfully.');
      }

      resetForm();
      fetchUsers();
    } catch (submitError) {
      alert(submitError.response?.data?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user._id);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role,
      department: user.department || 'CSE',
      registerNumber: user.registerNumber || '',
      staffId: user.staffId || '',
      isActive: user.isActive
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user account?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (deleteError) {
      alert(deleteError.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleStatusToggle = async (user) => {
    try {
      await api.patch(`/users/${user._id}/status`, { isActive: !user.isActive });
      fetchUsers();
    } catch (statusError) {
      alert(statusError.response?.data?.message || 'Failed to update user status.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header">
        <h1>User Management</h1>
        <p>Create admin, faculty, and student accounts, then manage user access and status.</p>
      </div>

      <div className="dashboard-section-card">
        <h2>{editingId ? 'Edit User' : 'Create User Account'}</h2>
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="form-control" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="text" className="form-control" value={formData.phone} onChange={handleChange} placeholder="e.g. +91 9876543210" />
            </div>
            <div className="form-group">
              <label htmlFor="password">{editingId ? 'New Password (optional)' : 'Password'}</label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                required={!editingId}
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" className="filter-select" value={formData.role} onChange={handleChange}>
                <option value="admin">Admin Account</option>
                <option value="student">Student Account</option>
              </select>
            </div>
            {formData.role !== 'admin' && (
              <div className="form-group">
                <label htmlFor="department">Department</label>
                <select id="department" name="department" className="filter-select" value={formData.department} onChange={handleChange}>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {formData.role === 'faculty' && (
              <div className="form-group">
                <label htmlFor="staffId">Staff ID</label>
                <input id="staffId" name="staffId" className="form-control" value={formData.staffId} onChange={handleChange} required />
              </div>
            )}
            {formData.role === 'student' && (
              <div className="form-group">
                <label htmlFor="registerNumber">Register Number</label>
                <input
                  id="registerNumber"
                  name="registerNumber"
                  className="form-control"
                  value={formData.registerNumber}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="isActive">Account Status</label>
              <select
                id="isActive"
                name="isActive"
                className="filter-select"
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>

      <div className="dashboard-section-card">
        <div className="users-toolbar">
          <h2>All Users</h2>
          <input
            className="search-input users-search"
            placeholder="Search by name, email, phone, register number, or staff ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {error && <p className="error-text-inline">{error}</p>}
        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            No users found matching your search.
          </p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Identifier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || 'N/A'}</td>
                    <td>
                      <span className="badge badge-primary">{user.role}</span>
                    </td>
                    <td>{user.department || 'N/A'}</td>
                    <td>{user.registerNumber || user.staffId || 'N/A'}</td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="action-btn edit" onClick={() => handleEdit(user)}>
                          ✏️
                        </button>
                        <button type="button" className="action-btn" onClick={() => handleStatusToggle(user)}>
                          {user.isActive ? '⏸️' : '▶️'}
                        </button>
                        <button type="button" className="action-btn delete" onClick={() => handleDelete(user._id)}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
