import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Spinner from './Spinner';
import { BarChart } from './Charts';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AI&DS'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const AIComparison = () => {
  const [compType, setCompType] = useState('department');
  const [target1, setTarget1] = useState('CSE');
  const [target2, setTarget2] = useState('ECE');

  const [studentsList, setStudentsList] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available students list for student vs student dropdown
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data } = await api.get('/students');
        setStudentsList(data.students || []);
        if (data.students?.length >= 2) {
          setTarget1(data.students[0].registerNumber);
          setTarget2(data.students[1].registerNumber);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStudents();
  }, []);

  const runComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        type: compType,
        target1,
        target2
      });

      const { data } = await api.get(`/ai/comparison?${params.toString()}`);
      setComparison(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate comparison.');
    } finally {
      setLoading(false);
    }
  }, [compType, target1, target2]);

  useEffect(() => {
    runComparison();
  }, [runComparison]);

  const handleTypeChange = (newType) => {
    setCompType(newType);
    if (newType === 'department') {
      setTarget1('CSE');
      setTarget2('ECE');
    } else if (newType === 'semester') {
      setTarget1('3');
      setTarget2('5');
    } else if (newType === 'student' && studentsList.length >= 2) {
      setTarget1(studentsList[0].registerNumber);
      setTarget2(studentsList[1].registerNumber);
    }
  };

  const e1 = comparison?.entity1;
  const e2 = comparison?.entity2;

  const chartData = e1 && e2 ? [
    { label: e1.name, value: e1.cgpa || e1.avgCgpa || 0, color: '#3b82f6' },
    { label: e2.name, value: e2.cgpa || e2.avgCgpa || 0, color: '#10b981' }
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>📊 AI Multi-Entity Comparison Tool</h1>
        <p style={{ color: 'var(--text-muted)' }}>Perform side-by-side comparative analysis for Students, Departments, or Semesters.</p>
      </div>

      {/* Comparison Selector */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => handleTypeChange('department')}
            style={tabBtn(compType === 'department')}
          >
            🏢 Dept vs Dept
          </button>
          <button
            onClick={() => handleTypeChange('student')}
            style={tabBtn(compType === 'student')}
          >
            🎓 Student vs Student
          </button>
          <button
            onClick={() => handleTypeChange('semester')}
            style={tabBtn(compType === 'semester')}
          >
            📈 Semester vs Semester
          </button>
        </div>

        {/* Dynamic Target Selectors */}
        <div className="form-grid">
          <div className="form-group">
            <label>Entity 1 *</label>
            {compType === 'department' ? (
              <select className="form-control" value={target1} onChange={e => setTarget1(e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : compType === 'semester' ? (
              <select className="form-control" value={target1} onChange={e => setTarget1(e.target.value)}>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            ) : (
              <select className="form-control" value={target1} onChange={e => setTarget1(e.target.value)}>
                {studentsList.map(st => <option key={st._id} value={st.registerNumber}>{st.name} ({st.registerNumber})</option>)}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>Entity 2 *</label>
            {compType === 'department' ? (
              <select className="form-control" value={target2} onChange={e => setTarget2(e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : compType === 'semester' ? (
              <select className="form-control" value={target2} onChange={e => setTarget2(e.target.value)}>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            ) : (
              <select className="form-control" value={target2} onChange={e => setTarget2(e.target.value)}>
                {studentsList.map(st => <option key={st._id} value={st.registerNumber}>{st.name} ({st.registerNumber})</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {error && <div style={alertStyle('error')}>{error}</div>}

      {/* Comparison Results Card */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div>
      ) : e1 && e2 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Side-by-side Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={entityCardStyle('#3b82f6')}>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>ENTITY 1</div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem', fontWeight: 800, margin: '0.25rem 0 0.75rem' }}>
                {e1.name}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                {e1.registerNumber && <div>Register No: <strong>{e1.registerNumber}</strong></div>}
                {e1.department && <div>Department: <strong>{e1.department}</strong></div>}
                <div>CGPA / Avg CGPA: <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{e1.cgpa || e1.avgCgpa}</strong></div>
                {e1.percentage !== undefined && <div>Percentage: <strong>{e1.percentage}%</strong></div>}
                {e1.rank && <div>College Rank: <span className="badge badge-warning">#{e1.rank}</span></div>}
                {e1.passPercentage !== undefined && <div>Pass Rate: <span className="badge badge-success">{e1.passPercentage}%</span></div>}
              </div>
            </div>

            <div style={entityCardStyle('#10b981')}>
              <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>ENTITY 2</div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem', fontWeight: 800, margin: '0.25rem 0 0.75rem' }}>
                {e2.name}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                {e2.registerNumber && <div>Register No: <strong>{e2.registerNumber}</strong></div>}
                {e2.department && <div>Department: <strong>{e2.department}</strong></div>}
                <div>CGPA / Avg CGPA: <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{e2.cgpa || e2.avgCgpa}</strong></div>
                {e2.percentage !== undefined && <div>Percentage: <strong>{e2.percentage}%</strong></div>}
                {e2.rank && <div>College Rank: <span className="badge badge-warning">#{e2.rank}</span></div>}
                {e2.passPercentage !== undefined && <div>Pass Rate: <span className="badge badge-success">{e2.passPercentage}%</span></div>}
              </div>
            </div>
          </div>

          {/* Comparison Bar Chart */}
          <div style={cardStyle}>
            <BarChart data={chartData} xKey="label" yKey="value" title="📈 Side-by-Side CGPA Comparison" height={220} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ── Shared Styles ──
const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
};

const entityCardStyle = (borderColor) => ({
  background: 'var(--bg-card)',
  border: `2px solid ${borderColor}`,
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
});

const tabBtn = (active) => ({
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  padding: '0.5rem 1rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.2s'
});

const alertStyle = (type) => ({
  padding: '0.85rem 1.2rem',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontWeight: 500,
  background: type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
  color: type === 'error' ? '#f87171' : '#34d399',
  border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
});

export default AIComparison;
