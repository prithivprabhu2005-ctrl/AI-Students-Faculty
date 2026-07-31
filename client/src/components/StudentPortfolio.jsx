import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Spinner from './Spinner';
import { useAuth } from '../context/AuthContext';

const PREDEFINED_SOFT_SKILLS = [
  'Communication', 'Leadership', 'Team Work', 'Problem Solving',
  'Critical Thinking', 'Presentation Skills', 'Time Management',
  'Adaptability', 'Creativity', 'Work Ethic'
];

const CERT_PROVIDERS = [
  'AWS', 'Azure', 'Google Cloud', 'Cisco CCNA', 'Oracle',
  'NPTEL', 'Coursera', 'Udemy', 'Infosys Springboard',
  'TCS iON', 'MongoDB', 'Docker', 'Kubernetes', 'Other'
];

const EXTRA_ACTIVITIES = [
  'NSS', 'NCC', 'Rotaract', 'Photography', 'Music',
  'Dance', 'Drama', 'Event Organizer', 'College Club', 'Volunteer', 'Other'
];

const StudentPortfolio = ({ mode = 'student' }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'faculty';

  // Portfolio state
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('skills');

  // Admin Search & Filter state
  const [portfoliosList, setPortfoliosList] = useState([]);
  const [selectedStudentReg, setSelectedStudentReg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [certFilter, setCertFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Form states for adding items
  const [newSkillCategory, setNewSkillCategory] = useState('programmingLanguages');
  const [newSkillText, setNewSkillText] = useState('');

  const [certForm, setCertForm] = useState({ name: '', provider: 'AWS', issueDate: '', expiryDate: '', certificateId: '', credentialUrl: '', fileUrl: '' });
  const [sportsForm, setSportsForm] = useState({ sportName: '', level: 'College', position: '', achievement: '', fileUrl: '' });
  const [extraForm, setExtraForm] = useState({ activityName: 'NSS', role: '', description: '', year: '' });
  const [workshopForm, setWorkshopForm] = useState({ workshopName: '', organizer: '', date: '', fileUrl: '' });
  const [internshipForm, setInternshipForm] = useState({ companyName: '', role: '', duration: '', description: '', fileUrl: '' });
  const [projectForm, setProjectForm] = useState({ projectTitle: '', description: '', technologiesUsed: '', githubLink: '', liveDemoLink: '', role: '' });
  const [langForm, setLangForm] = useState({ language: '', read: true, write: true, speak: true });
  const [achievementForm, setAchievementForm] = useState({ title: '', description: '', date: '', fileUrl: '' });

  // Fetch portfolio data
  const fetchMyPortfolio = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/portfolio/me');
      setPortfolio(res.data.portfolio);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load portfolio.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentPortfolio = async (regNo) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/portfolio/student/${regNo}`);
      setPortfolio(res.data.portfolio);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student portfolio.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPortfolios = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (deptFilter) params.department = deptFilter;
      if (skillFilter) params.skill = skillFilter;
      if (certFilter) params.certification = certFilter;
      if (sportFilter) params.sport = sportFilter;
      if (projectFilter) params.project = projectFilter;

      const res = await api.get('/portfolio/admin/all', { params });
      setPortfoliosList(res.data.portfolios || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search portfolios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && mode === 'admin') {
      fetchAllPortfolios();
    } else {
      fetchMyPortfolio();
    }
  }, [mode]);

  const savePortfolioUpdates = async (updatedData) => {
    try {
      setSaving(true);
      setMessage('');
      setError('');
      const res = await api.put('/portfolio/me', updatedData);
      setPortfolio(res.data.portfolio);
      setMessage('Portfolio updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save portfolio.');
    } finally {
      setSaving(false);
    }
  };

  // Handlers for Adding Items
  const handleAddSkill = () => {
    if (!newSkillText.trim() || !portfolio) return;
    const current = portfolio.technicalSkills || {};
    const list = current[newSkillCategory] || [];
    if (list.includes(newSkillText.trim())) return;

    const updatedTechSkills = {
      ...current,
      [newSkillCategory]: [...list, newSkillText.trim()]
    };

    savePortfolioUpdates({ technicalSkills: updatedTechSkills });
    setNewSkillText('');
  };

  const handleRemoveSkill = (category, skillToRemove) => {
    if (!portfolio) return;
    const current = portfolio.technicalSkills || {};
    const list = current[category] || [];
    const updatedTechSkills = {
      ...current,
      [category]: list.filter(s => s !== skillToRemove)
    };
    savePortfolioUpdates({ technicalSkills: updatedTechSkills });
  };

  const handleToggleSoftSkill = (skill) => {
    if (!portfolio) return;
    const current = portfolio.softSkills || [];
    const updated = current.includes(skill)
      ? current.filter(s => s !== skill)
      : [...current, skill];
    savePortfolioUpdates({ softSkills: updated });
  };

  const handleAddCertification = (e) => {
    e.preventDefault();
    if (!certForm.name.trim()) return;
    const updated = [...(portfolio.certifications || []), certForm];
    savePortfolioUpdates({ certifications: updated });
    setCertForm({ name: '', provider: 'AWS', issueDate: '', expiryDate: '', certificateId: '', credentialUrl: '', fileUrl: '' });
  };

  const handleRemoveCertification = (index) => {
    const updated = portfolio.certifications.filter((_, i) => i !== index);
    savePortfolioUpdates({ certifications: updated });
  };

  const handleAddSports = (e) => {
    e.preventDefault();
    if (!sportsForm.sportName.trim()) return;
    const updated = [...(portfolio.sports || []), sportsForm];
    savePortfolioUpdates({ sports: updated });
    setSportsForm({ sportName: '', level: 'College', position: '', achievement: '', fileUrl: '' });
  };

  const handleRemoveSports = (index) => {
    const updated = portfolio.sports.filter((_, i) => i !== index);
    savePortfolioUpdates({ sports: updated });
  };

  const handleAddExtra = (e) => {
    e.preventDefault();
    if (!extraForm.activityName.trim()) return;
    const updated = [...(portfolio.extraCurricular || []), extraForm];
    savePortfolioUpdates({ extraCurricular: updated });
    setExtraForm({ activityName: 'NSS', role: '', description: '', year: '' });
  };

  const handleRemoveExtra = (index) => {
    const updated = portfolio.extraCurricular.filter((_, i) => i !== index);
    savePortfolioUpdates({ extraCurricular: updated });
  };

  const handleAddWorkshop = (e) => {
    e.preventDefault();
    if (!workshopForm.workshopName.trim()) return;
    const updated = [...(portfolio.workshops || []), workshopForm];
    savePortfolioUpdates({ workshops: updated });
    setWorkshopForm({ workshopName: '', organizer: '', date: '', fileUrl: '' });
  };

  const handleRemoveWorkshop = (index) => {
    const updated = portfolio.workshops.filter((_, i) => i !== index);
    savePortfolioUpdates({ workshops: updated });
  };

  const handleAddInternship = (e) => {
    e.preventDefault();
    if (!internshipForm.companyName.trim()) return;
    const updated = [...(portfolio.internships || []), internshipForm];
    savePortfolioUpdates({ internships: updated });
    setInternshipForm({ companyName: '', role: '', duration: '', description: '', fileUrl: '' });
  };

  const handleRemoveInternship = (index) => {
    const updated = portfolio.internships.filter((_, i) => i !== index);
    savePortfolioUpdates({ internships: updated });
  };

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!projectForm.projectTitle.trim()) return;
    const item = {
      ...projectForm,
      technologiesUsed: projectForm.technologiesUsed
        ? projectForm.technologiesUsed.split(',').map(s => s.trim()).filter(Boolean)
        : []
    };
    const updated = [...(portfolio.projects || []), item];
    savePortfolioUpdates({ projects: updated });
    setProjectForm({ projectTitle: '', description: '', technologiesUsed: '', githubLink: '', liveDemoLink: '', role: '' });
  };

  const handleRemoveProject = (index) => {
    const updated = portfolio.projects.filter((_, i) => i !== index);
    savePortfolioUpdates({ projects: updated });
  };

  const handleAddLanguage = (e) => {
    e.preventDefault();
    if (!langForm.language.trim()) return;
    const updated = [...(portfolio.languagesKnown || []), langForm];
    savePortfolioUpdates({ languagesKnown: updated });
    setLangForm({ language: '', read: true, write: true, speak: true });
  };

  const handleRemoveLanguage = (index) => {
    const updated = portfolio.languagesKnown.filter((_, i) => i !== index);
    savePortfolioUpdates({ languagesKnown: updated });
  };

  const handleAddAchievement = (e) => {
    e.preventDefault();
    if (!achievementForm.title.trim()) return;
    const updated = [...(portfolio.achievements || []), achievementForm];
    savePortfolioUpdates({ achievements: updated });
    setAchievementForm({ title: '', description: '', date: '', fileUrl: '' });
  };

  const handleRemoveAchievement = (index) => {
    const updated = portfolio.achievements.filter((_, i) => i !== index);
    savePortfolioUpdates({ achievements: updated });
  };

  const handleFileUpload = (e, setFormState) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormState(prev => ({ ...prev, fileUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const canEdit = !isAdmin || mode !== 'admin';

  return (
    <div className="portfolio-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>💼 Student Portfolio & Skills Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Comprehensive showcase of technical skills, certifications, projects, sports achievements, and internships.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {portfolio && (
            <button className="btn btn-secondary" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📥 Download Portfolio PDF
            </button>
          )}
        </div>
      </div>

      {message && <div className="auth-alert success">{message}</div>}
      {error && <div className="auth-alert error">{error}</div>}

      {/* Admin Search & Filter Bar */}
      {isAdmin && mode === 'admin' && (
        <div className="dashboard-section-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔍 Admin Portfolio Directory & Filters
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search Student Name / Reg No"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="select-input">
              <option value="">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="IT">IT</option>
              <option value="AI&DS">AI&DS</option>
            </select>
            <input
              type="text"
              placeholder="Filter by Skill (e.g. React)"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="search-input"
            />
            <input
              type="text"
              placeholder="Filter by Certification (e.g. AWS)"
              value={certFilter}
              onChange={(e) => setCertFilter(e.target.value)}
              className="search-input"
            />
            <input
              type="text"
              placeholder="Filter by Sport (e.g. Cricket)"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="search-input"
            />
            <input
              type="text"
              placeholder="Filter by Project (e.g. AI Bot)"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="btn btn-primary" onClick={fetchAllPortfolios} style={{ padding: '0.4rem 1rem' }}>
            Filter Portfolios
          </button>

          {/* Student selection dropdown list */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
              Select Student Portfolio to View ({portfoliosList.length} Found):
            </label>
            <select
              value={selectedStudentReg}
              onChange={(e) => {
                setSelectedStudentReg(e.target.value);
                if (e.target.value) fetchStudentPortfolio(e.target.value);
              }}
              className="select-input"
              style={{ width: '100%', maxWidth: '500px' }}
            >
              <option value="">-- Choose a Student Portfolio --</option>
              {portfoliosList.map(p => (
                <option key={p._id} value={p.registerNumber}>
                  {p.student?.name || 'Student'} ({p.registerNumber}) - {p.student?.department} | Skills: {(p.technicalSkills?.programmingLanguages || []).join(', ') || 'N/A'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : !portfolio ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <h3>No Portfolio Selected</h3>
          <p>Please select a student from the directory above to view their portfolio.</p>
        </div>
      ) : (
        <div className="portfolio-content-area" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Printable Header Profile Card */}
          <div className="dashboard-section-card" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '0.4rem', display: 'inline-block' }}>
                  {portfolio.student?.department || 'Department'}
                </span>
                <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{portfolio.student?.name || 'Student Portfolio'}</h2>
                <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                  Reg No: <strong>{portfolio.registerNumber}</strong> | Student ID: <strong>{portfolio.studentId}</strong> | Email: <strong>{portfolio.student?.email}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={miniBadgeStyle}>
                  <span>💻</span> <strong>{(portfolio.projects || []).length}</strong> Projects
                </div>
                <div style={miniBadgeStyle}>
                  <span>🏆</span> <strong>{(portfolio.certifications || []).length}</strong> Certs
                </div>
                <div style={miniBadgeStyle}>
                  <span>🏢</span> <strong>{(portfolio.internships || []).length}</strong> Internships
                </div>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div style={tabContainerStyle} className="no-print">
            <button onClick={() => setActiveTab('skills')} style={tabBtnStyle(activeTab === 'skills')}>
              💻 Tech & Soft Skills
            </button>
            <button onClick={() => setActiveTab('certs')} style={tabBtnStyle(activeTab === 'certs')}>
              📜 Certifications ({portfolio.certifications?.length || 0})
            </button>
            <button onClick={() => setActiveTab('projects')} style={tabBtnStyle(activeTab === 'projects')}>
              🚀 Projects ({portfolio.projects?.length || 0})
            </button>
            <button onClick={() => setActiveTab('internships')} style={tabBtnStyle(activeTab === 'internships')}>
              🏢 Internships ({portfolio.internships?.length || 0})
            </button>
            <button onClick={() => setActiveTab('sports')} style={tabBtnStyle(activeTab === 'sports')}>
              🏅 Sports ({portfolio.sports?.length || 0})
            </button>
            <button onClick={() => setActiveTab('extra')} style={tabBtnStyle(activeTab === 'extra')}>
              🎭 Extra-Curricular ({portfolio.extraCurricular?.length || 0})
            </button>
            <button onClick={() => setActiveTab('more')} style={tabBtnStyle(activeTab === 'more')}>
              🎓 Workshops, Languages & Achievements
            </button>
          </div>

          {/* SECTION A & I: TECHNICAL SKILLS & SOFT SKILLS */}
          {(activeTab === 'skills' || mode === 'print') && (
            <div className="dashboard-section-card">
              <h2>💻 A. Technical & Soft Skills</h2>
              <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

              {/* Add New Skill Input (Student Mode) */}
              {canEdit && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <select
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value)}
                    className="select-input"
                    style={{ width: '200px' }}
                  >
                    <option value="programmingLanguages">Programming Languages</option>
                    <option value="webTechnologies">Web Technologies</option>
                    <option value="databases">Databases</option>
                    <option value="cloudTechnologies">Cloud Technologies</option>
                    <option value="aiMlSkills">AI / ML Skills</option>
                    <option value="tools">Tools</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Enter skill tag (e.g. Python, React)"
                    value={newSkillText}
                    onChange={(e) => setNewSkillText(e.target.value)}
                    className="search-input"
                    style={{ flex: 1, minWidth: '200px' }}
                  />
                  <button className="btn btn-primary" onClick={handleAddSkill} disabled={saving}>
                    + Add Skill
                  </button>
                </div>
              )}

              {/* Skill Categories Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <SkillBox
                  title="🐍 Programming Languages"
                  skills={portfolio.technicalSkills?.programmingLanguages || []}
                  onRemove={(s) => handleRemoveSkill('programmingLanguages', s)}
                  canEdit={canEdit}
                />
                <SkillBox
                  title="🌐 Web Technologies"
                  skills={portfolio.technicalSkills?.webTechnologies || []}
                  onRemove={(s) => handleRemoveSkill('webTechnologies', s)}
                  canEdit={canEdit}
                />
                <SkillBox
                  title="🛢️ Databases"
                  skills={portfolio.technicalSkills?.databases || []}
                  onRemove={(s) => handleRemoveSkill('databases', s)}
                  canEdit={canEdit}
                />
                <SkillBox
                  title="☁️ Cloud Technologies"
                  skills={portfolio.technicalSkills?.cloudTechnologies || []}
                  onRemove={(s) => handleRemoveSkill('cloudTechnologies', s)}
                  canEdit={canEdit}
                />
                <SkillBox
                  title="🤖 AI & ML Skills"
                  skills={portfolio.technicalSkills?.aiMlSkills || []}
                  onRemove={(s) => handleRemoveSkill('aiMlSkills', s)}
                  canEdit={canEdit}
                />
                <SkillBox
                  title="🛠️ Tools & DevOps"
                  skills={portfolio.technicalSkills?.tools || []}
                  onRemove={(s) => handleRemoveSkill('tools', s)}
                  canEdit={canEdit}
                />
              </div>

              {/* Section I: Soft Skills */}
              <div style={{ marginTop: '2rem' }}>
                <h3>🗣️ I. Soft Skills</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select interpersonal and leadership skills to display on your profile:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {PREDEFINED_SOFT_SKILLS.map(skill => {
                    const isSelected = (portfolio.softSkills || []).includes(skill);
                    return (
                      <span
                        key={skill}
                        onClick={() => canEdit && handleToggleSoftSkill(skill)}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '20px',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          cursor: canEdit ? 'pointer' : 'default',
                          background: isSelected ? 'var(--primary)' : 'var(--bg-muted, #f3f4f6)',
                          color: isSelected ? '#ffffff' : 'var(--text-color)',
                          border: '1px solid var(--border-color)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '} {skill}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: CERTIFICATIONS */}
          {(activeTab === 'certs' || mode === 'print') && (
            <div className="dashboard-section-card">
              <h2>📜 B. Industry Certifications</h2>
              <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

              {canEdit && (
                <form onSubmit={handleAddCertification} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-muted, #f9fafb)', borderRadius: '10px' }}>
                  <input type="text" placeholder="Certificate Name *" value={certForm.name} onChange={e => setCertForm({ ...certForm, name: e.target.value })} required className="search-input" />
                  <select value={certForm.provider} onChange={e => setCertForm({ ...certForm, provider: e.target.value })} className="select-input">
                    {CERT_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="date" placeholder="Issue Date" value={certForm.issueDate} onChange={e => setCertForm({ ...certForm, issueDate: e.target.value })} className="search-input" />
                  <input type="text" placeholder="Certificate ID" value={certForm.certificateId} onChange={e => setCertForm({ ...certForm, certificateId: e.target.value })} className="search-input" />
                  <input type="url" placeholder="Credential URL" value={certForm.credentialUrl} onChange={e => setCertForm({ ...certForm, credentialUrl: e.target.value })} className="search-input" />
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setCertForm)} className="search-input" />
                  <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={saving}>+ Add Certification</button>
                </form>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {(portfolio.certifications || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No certifications added yet.</p>
                ) : (
                  portfolio.certifications.map((cert, index) => (
                    <div key={index} style={itemCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="badge badge-warning">{cert.provider}</span>
                          <h4 style={{ margin: '0.4rem 0 0.2rem 0' }}>{cert.name}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                            {cert.issueDate ? `Issued: ${new Date(cert.issueDate).toLocaleDateString()}` : ''} {cert.certificateId ? `| ID: ${cert.certificateId}` : ''}
                          </p>
                        </div>
                        {canEdit && (
                          <button onClick={() => handleRemoveCertification(index)} style={deleteBtnStyle}>🗑️</button>
                        )}
                      </div>
                      {cert.credentialUrl && (
                        <a href={cert.credentialUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', display: 'inline-block', marginTop: '0.5rem' }}>
                          🔗 View Credential URL
                        </a>
                      )}
                      {cert.fileUrl && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <a href={cert.fileUrl} download={`Certificate_${cert.name}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}>
                            📄 Certificate File
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION G: PROJECTS */}
          {(activeTab === 'projects' || mode === 'print') && (
            <div className="dashboard-section-card">
              <h2>🚀 G. Technical Projects</h2>
              <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

              {canEdit && (
                <form onSubmit={handleAddProject} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-muted, #f9fafb)', borderRadius: '10px' }}>
                  <input type="text" placeholder="Project Title *" value={projectForm.projectTitle} onChange={e => setProjectForm({ ...projectForm, projectTitle: e.target.value })} required className="search-input" />
                  <input type="text" placeholder="Role (e.g. Lead Developer)" value={projectForm.role} onChange={e => setProjectForm({ ...projectForm, role: e.target.value })} className="search-input" />
                  <input type="text" placeholder="Technologies (comma separated: React, Node, MongoDB)" value={projectForm.technologiesUsed} onChange={e => setProjectForm({ ...projectForm, technologiesUsed: e.target.value })} className="search-input" />
                  <input type="url" placeholder="GitHub Repository Link" value={projectForm.githubLink} onChange={e => setProjectForm({ ...projectForm, githubLink: e.target.value })} className="search-input" />
                  <input type="url" placeholder="Live Demo Link" value={projectForm.liveDemoLink} onChange={e => setProjectForm({ ...projectForm, liveDemoLink: e.target.value })} className="search-input" />
                  <textarea placeholder="Project Description" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} className="search-input" style={{ gridColumn: '1 / -1', minHeight: '60px' }} />
                  <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={saving}>+ Add Project</button>
                </form>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {(portfolio.projects || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No projects added yet.</p>
                ) : (
                  portfolio.projects.map((proj, index) => (
                    <div key={index} style={itemCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0' }}>{proj.projectTitle}</h4>
                          {proj.role && <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{proj.role}</span>}
                        </div>
                        {canEdit && (
                          <button onClick={() => handleRemoveProject(index)} style={deleteBtnStyle}>🗑️</button>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-color)', fontSize: '0.88rem', margin: '0.5rem 0' }}>{proj.description}</p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        {(proj.technologiesUsed || []).map((tech, i) => (
                          <span key={i} className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{tech}</span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {proj.githubLink && <a href={proj.githubLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem' }}>💻 GitHub</a>}
                        {proj.liveDemoLink && <a href={proj.liveDemoLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem' }}>🚀 Live Demo</a>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION F: INTERNSHIPS */}
          {(activeTab === 'internships' || mode === 'print') && (
            <div className="dashboard-section-card">
              <h2>🏢 F. Internships & Work Experience</h2>
              <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

              {canEdit && (
                <form onSubmit={handleAddInternship} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-muted, #f9fafb)', borderRadius: '10px' }}>
                  <input type="text" placeholder="Company Name *" value={internshipForm.companyName} onChange={e => setInternshipForm({ ...internshipForm, companyName: e.target.value })} required className="search-input" />
                  <input type="text" placeholder="Role (e.g. SDE Intern)" value={internshipForm.role} onChange={e => setInternshipForm({ ...internshipForm, role: e.target.value })} className="search-input" />
                  <input type="text" placeholder="Duration (e.g. 3 Months / Jun - Aug 2025)" value={internshipForm.duration} onChange={e => setInternshipForm({ ...internshipForm, duration: e.target.value })} className="search-input" />
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setInternshipForm)} className="search-input" />
                  <textarea placeholder="Key Responsibilities / Description" value={internshipForm.description} onChange={e => setInternshipForm({ ...internshipForm, description: e.target.value })} className="search-input" style={{ gridColumn: '1 / -1', minHeight: '60px' }} />
                  <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={saving}>+ Add Internship</button>
                </form>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {(portfolio.internships || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No internships recorded yet.</p>
                ) : (
                  portfolio.internships.map((intern, index) => (
                    <div key={index} style={itemCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="badge badge-success">{intern.companyName}</span>
                          <h4 style={{ margin: '0.4rem 0 0.2rem 0' }}>{intern.role || 'Intern'}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Duration: {intern.duration || 'N/A'}</p>
                        </div>
                        {canEdit && (
                          <button onClick={() => handleRemoveInternship(index)} style={deleteBtnStyle}>🗑️</button>
                        )}
                      </div>
                      {intern.description && <p style={{ fontSize: '0.88rem', margin: '0.5rem 0' }}>{intern.description}</p>}
                      {intern.fileUrl && (
                        <a href={intern.fileUrl} download={`Internship_${intern.companyName}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}>
                          📄 Completion Certificate
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION C: SPORTS */}
          {(activeTab === 'sports' || mode === 'print') && (
            <div className="dashboard-section-card">
              <h2>🏅 C. Sports & Athletic Achievements</h2>
              <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

              {canEdit && (
                <form onSubmit={handleAddSports} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-muted, #f9fafb)', borderRadius: '10px' }}>
                  <input type="text" placeholder="Sport Name *" value={sportsForm.sportName} onChange={e => setSportsForm({ ...sportsForm, sportName: e.target.value })} required className="search-input" />
                  <select value={sportsForm.level} onChange={e => setSportsForm({ ...sportsForm, level: e.target.value })} className="select-input">
                    <option value="College">College Level</option>
                    <option value="District">District Level</option>
                    <option value="State">State Level</option>
                    <option value="National">National Level</option>
                    <option value="International">International Level</option>
                  </select>
                  <input type="text" placeholder="Position / Role (e.g. Captain)" value={sportsForm.position} onChange={e => setSportsForm({ ...sportsForm, position: e.target.value })} className="search-input" />
                  <input type="text" placeholder="Medal / Achievement (e.g. Gold Medal)" value={sportsForm.achievement} onChange={e => setSportsForm({ ...sportsForm, achievement: e.target.value })} className="search-input" />
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setSportsForm)} className="search-input" />
                  <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={saving}>+ Add Sport Achievement</button>
                </form>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {(portfolio.sports || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No sports achievements added yet.</p>
                ) : (
                  portfolio.sports.map((sp, index) => (
                    <div key={index} style={itemCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="badge badge-primary">{sp.level} Level</span>
                          <h4 style={{ margin: '0.4rem 0 0.2rem 0' }}>{sp.sportName}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                            {sp.position ? `Position: ${sp.position}` : ''} {sp.achievement ? `| ${sp.achievement}` : ''}
                          </p>
                        </div>
                        {canEdit && (
                          <button onClick={() => handleRemoveSports(index)} style={deleteBtnStyle}>🗑️</button>
                        )}
                      </div>
                      {sp.fileUrl && (
                        <a href={sp.fileUrl} download={`Sports_${sp.sportName}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem', marginTop: '0.5rem', display: 'inline-block' }}>
                          📄 Certificate File
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION D: EXTRA-CURRICULAR ACTIVITIES */}
          {(activeTab === 'extra' || mode === 'print') && (
            <div className="dashboard-section-card">
              <h2>🎭 D. Extra-Curricular Activities</h2>
              <hr style={{ borderColor: 'var(--border-color)', margin: '0.75rem 0 1.25rem 0' }} />

              {canEdit && (
                <form onSubmit={handleAddExtra} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-muted, #f9fafb)', borderRadius: '10px' }}>
                  <select value={extraForm.activityName} onChange={e => setExtraForm({ ...extraForm, activityName: e.target.value })} className="select-input">
                    {EXTRA_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input type="text" placeholder="Role (e.g. Lead Volunteer)" value={extraForm.role} onChange={e => setExtraForm({ ...extraForm, role: e.target.value })} className="search-input" />
                  <input type="text" placeholder="Year (e.g. 2024 - 2025)" value={extraForm.year} onChange={e => setExtraForm({ ...extraForm, year: e.target.value })} className="search-input" />
                  <input type="text" placeholder="Brief Description" value={extraForm.description} onChange={e => setExtraForm({ ...extraForm, description: e.target.value })} className="search-input" style={{ gridColumn: '1 / -1' }} />
                  <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={saving}>+ Add Extra-Curricular Activity</button>
                </form>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {(portfolio.extraCurricular || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No extra-curricular activities listed yet.</p>
                ) : (
                  portfolio.extraCurricular.map((ext, index) => (
                    <div key={index} style={itemCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="badge badge-warning">{ext.activityName}</span>
                          <h4 style={{ margin: '0.4rem 0 0.2rem 0' }}>{ext.role || 'Member'}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Year: {ext.year || 'N/A'}</p>
                        </div>
                        {canEdit && (
                          <button onClick={() => handleRemoveExtra(index)} style={deleteBtnStyle}>🗑️</button>
                        )}
                      </div>
                      {ext.description && <p style={{ fontSize: '0.88rem', margin: '0.5rem 0 0 0' }}>{ext.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION E, H, J: WORKSHOPS, LANGUAGES & ACHIEVEMENTS */}
          {(activeTab === 'more' || mode === 'print') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* E. Workshops */}
              <div className="dashboard-section-card">
                <h2>🎓 E. Workshops & Seminars</h2>
                {canEdit && (
                  <form onSubmit={handleAddWorkshop} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-muted, #f9fafb)', borderRadius: '10px' }}>
                    <input type="text" placeholder="Workshop Name *" value={workshopForm.workshopName} onChange={e => setWorkshopForm({ ...workshopForm, workshopName: e.target.value })} required className="search-input" />
                    <input type="text" placeholder="Organizer (e.g. IEEE / College)" value={workshopForm.organizer} onChange={e => setWorkshopForm({ ...workshopForm, organizer: e.target.value })} className="search-input" />
                    <input type="date" value={workshopForm.date} onChange={e => setWorkshopForm({ ...workshopForm, date: e.target.value })} className="search-input" />
                    <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setWorkshopForm)} className="search-input" />
                    <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={saving}>+ Add Workshop</button>
                  </form>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {(portfolio.workshops || []).map((wk, idx) => (
                    <div key={idx} style={itemCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{wk.workshopName}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>Org: {wk.organizer || 'N/A'}</p>
                        </div>
                        {canEdit && <button onClick={() => handleRemoveWorkshop(idx)} style={deleteBtnStyle}>🗑️</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* H. Languages Known */}
              <div className="dashboard-section-card">
                <h2>🗣️ H. Languages Known</h2>
                {canEdit && (
                  <form onSubmit={handleAddLanguage} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <input type="text" placeholder="Language (e.g. English, Tamil, Hindi)" value={langForm.language} onChange={e => setLangForm({ ...langForm, language: e.target.value })} required className="search-input" style={{ width: '200px' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><input type="checkbox" checked={langForm.read} onChange={e => setLangForm({ ...langForm, read: e.target.checked })} /> Read</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><input type="checkbox" checked={langForm.write} onChange={e => setLangForm({ ...langForm, write: e.target.checked })} /> Write</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><input type="checkbox" checked={langForm.speak} onChange={e => setLangForm({ ...langForm, speak: e.target.checked })} /> Speak</label>
                    <button type="submit" className="btn btn-primary">+ Add Language</button>
                  </form>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {(portfolio.languagesKnown || []).map((lang, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-muted, #f3f4f6)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <strong>{lang.language}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        ({[lang.read && 'Read', lang.write && 'Write', lang.speak && 'Speak'].filter(Boolean).join(', ')})
                      </span>
                      {canEdit && <button onClick={() => handleRemoveLanguage(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>}
                    </div>
                  ))}
                </div>
              </div>

              {/* J. Achievements */}
              <div className="dashboard-section-card">
                <h2>🏆 J. Other Honors & Achievements</h2>
                {canEdit && (
                  <form onSubmit={handleAddAchievement} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-muted, #f9fafb)', borderRadius: '10px' }}>
                    <input type="text" placeholder="Achievement Title *" value={achievementForm.title} onChange={e => setAchievementForm({ ...achievementForm, title: e.target.value })} required className="search-input" />
                    <input type="date" value={achievementForm.date} onChange={e => setAchievementForm({ ...achievementForm, date: e.target.value })} className="search-input" />
                    <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setAchievementForm)} className="search-input" />
                    <input type="text" placeholder="Description" value={achievementForm.description} onChange={e => setAchievementForm({ ...achievementForm, description: e.target.value })} className="search-input" style={{ gridColumn: '1 / -1' }} />
                    <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={saving}>+ Add Achievement</button>
                  </form>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {(portfolio.achievements || []).map((ach, idx) => (
                    <div key={idx} style={itemCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{ach.title}</h4>
                          {ach.description && <p style={{ fontSize: '0.88rem', margin: '0.25rem 0' }}>{ach.description}</p>}
                        </div>
                        {canEdit && <button onClick={() => handleRemoveAchievement(idx)} style={deleteBtnStyle}>🗑️</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Skill Box Sub-component
const SkillBox = ({ title, skills = [], onRemove, canEdit }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>{title}</h4>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {skills.length === 0 ? (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None added</span>
      ) : (
        skills.map((skill, idx) => (
          <span key={idx} className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
            {skill}
            {canEdit && (
              <span onClick={() => onRemove(skill)} style={{ cursor: 'pointer', fontWeight: 700, marginLeft: '2px' }}>
                ×
              </span>
            )}
          </span>
        ))
      )}
    </div>
  </div>
);

// Inline Styles
const miniBadgeStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '0.4rem 0.75rem',
  fontSize: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem'
};

const tabContainerStyle = {
  display: 'flex',
  gap: '0.5rem',
  borderBottom: '2px solid var(--border-color)',
  overflowX: 'auto',
  paddingBottom: '0px'
};

const tabBtnStyle = (active) => ({
  background: 'none',
  border: 'none',
  borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  padding: '0.65rem 1rem',
  fontWeight: active ? 700 : 500,
  fontSize: '0.9rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s',
  marginBottom: '-2px'
});

const itemCardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  padding: '1rem'
};

const deleteBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1rem',
  padding: '2px 4px'
};

export default StudentPortfolio;
