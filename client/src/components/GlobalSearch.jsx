import { useState, useEffect } from 'react';
import api from '../services/api';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header">
        <h1>🔍 Global System Search</h1>
        <p style={{ color: 'var(--text-muted)' }}>Search across Students, Faculty, Subjects, and Departments instantly.</p>
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
        <input
          className="search-input"
          style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', fontSize: '1rem', borderRadius: '12px' }}
          placeholder="Search by student name, register no, faculty, subject code, or department..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', color: 'var(--text-muted)' }}>🔍</span>
      </div>

      {loading && <div style={{ color: 'var(--text-muted)' }}>Searching...</div>}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Student Matches */}
          {results.students?.length > 0 && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>🎓 Students ({results.students.length})</h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Register No</th>
                      <th>Department</th>
                      <th>Sem</th>
                      <th>CGPA</th>
                      <th>Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.students.map(s => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td><span className="badge badge-primary">{s.registerNumber}</span></td>
                        <td>{s.department}</td>
                        <td>Sem {s.semester}</td>
                        <td>{s.cgpa}</td>
                        <td>#{s.rank}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Faculty Matches */}
          {results.faculties?.length > 0 && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>👨‍🏫 Faculty ({results.faculties.length})</h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Staff ID</th>
                      <th>Department</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.faculties.map(f => (
                      <tr key={f._id}>
                        <td style={{ fontWeight: 600 }}>{f.name}</td>
                        <td><span className="badge badge-primary">{f.staffId || 'N/A'}</span></td>
                        <td>{f.department}</td>
                        <td>{f.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subject Matches */}
          {results.subjects?.length > 0 && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>📚 Subjects ({results.subjects.length})</h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Department</th>
                      <th>Semester</th>
                      <th>Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.subjects.map(sub => (
                      <tr key={sub._id}>
                        <td><span className="badge badge-primary">{sub.subjectCode}</span></td>
                        <td style={{ fontWeight: 600 }}>{sub.subjectName}</td>
                        <td>{sub.department}</td>
                        <td>Sem {sub.semester}</td>
                        <td>{sub.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
};

const cardTitleStyle = {
  fontFamily: 'var(--font-title)',
  fontSize: '1.1rem',
  fontWeight: 700,
  marginBottom: '1rem'
};

export default GlobalSearch;
