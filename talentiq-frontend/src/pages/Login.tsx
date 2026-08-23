import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, User, Building2, ShieldCheck, LogIn, ArrowRight, RefreshCw, UserPlus } from 'lucide-react';
import MilkyWay3DCanvas from '../components/MilkyWay3DCanvas';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import '../css/login.css';

type LoginRoleMode = 'CANDIDATE' | 'HR' | 'ADMIN';
type AuthCardMode = 'LOGIN' | 'REGISTER';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [authCardMode, setAuthCardMode] = useState<AuthCardMode>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<LoginRoleMode>('CANDIDATE');
  const [flippingClass, setFlippingClass] = useState<string>('');

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick Register Form State (Back Face)
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regDesiredRole, setRegDesiredRole] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // ── Trigger 3D Super Motion Flip when switching Role Tabs ──
  const handleRoleSelect = (role: LoginRoleMode) => {
    if (role === selectedRole) return;

    // Trigger dynamic 3D super motion flip class
    const animClass =
      role === 'HR'
        ? 'flipping-role-hr'
        : role === 'CANDIDATE'
        ? 'flipping-role-candidate'
        : 'flipping-role-admin';

    setFlippingClass(animClass);
    setSelectedRole(role);
    setError('');

    // Reset animation class after flip finishes
    setTimeout(() => {
      setFlippingClass('');
    }, 750);
  };

  // ── Trigger 180° 3D Card Flip between Login & Register ──
  const toggleAuthCardMode = () => {
    setError('');
    setRegError('');
    setAuthCardMode((prev) => (prev === 'LOGIN' ? 'REGISTER' : 'LOGIN'));
  };

  // ── Handle Login Submit ──
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim().endsWith('@gmail.com')) {
      setError('Only @gmail.com email addresses are allowed for login.');
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const roles = savedUser.roles || [];
      const userIsHr = roles.includes('ROLE_HR') || roles.includes('HR') || selectedRole === 'HR';
      const userIsAdmin = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('SUPER_ADMIN') || selectedRole === 'ADMIN';

      if (userIsAdmin) {
        navigate('/admin');
      } else if (userIsHr) {
        navigate('/hr-analytics');
      } else {
        navigate('/jobs');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Quick Registration on Back Face ──
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regEmail.trim().endsWith('@gmail.com')) {
      setRegError('Registration requires an email ending with @gmail.com.');
      return;
    }
    setRegLoading(true);
    try {
      if (selectedRole === 'HR') {
        await register({
          firstName: regFirstName,
          lastName: regLastName,
          email: regEmail.trim(),
          password: regPassword,
          role: 'ROLE_HR',
          companyName: regCompany || 'My Enterprise Corp',
          jobTitle: 'Recruitment Lead',
        });
        navigate('/hr-analytics');
      } else {
        await register({
          firstName: regFirstName,
          lastName: regLastName,
          email: regEmail.trim(),
          password: regPassword,
          role: 'ROLE_CANDIDATE',
          desiredRole: regDesiredRole || 'Software Engineer',
          yearsExperience: 2,
        });
        navigate('/jobs');
      }
    } catch (err: any) {
      setRegError(err?.response?.data?.message || err?.message || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* ── 3D Milky Way Galaxy & Planetary Orbit Canvas ── */}
      <MilkyWay3DCanvas interactive={true} showOrbits={true} />

      {/* ── 3D Perspective Stage ── */}
      <div className="login-3d-perspective-stage">
        <div
          className={`login-3d-flipper ${
            authCardMode === 'REGISTER' ? 'is-register-flipped' : ''
          } ${flippingClass}`}
        >
          {/* ============================================================
              FRONT FACE: SIGN IN
             ============================================================ */}
          <div className="card-face card-face-front">
            {/* Header */}
            <div className="login-header">
              <div className="login-icon-badge">
                <Sparkles size={28} color="#FFF" />
              </div>
              <h2 className="login-title">Sign In to TalentIQ</h2>
              <p className="login-subtitle">Milky Way Cosmic Portal — Select account type to sign in</p>
            </div>

            {/* Explicit Role Selector Tabs (Triggers 3D Super Motion Flip) */}
            <div className="login-role-tabs">
              <button
                type="button"
                onClick={() => handleRoleSelect('CANDIDATE')}
                className={`login-role-tab ${selectedRole === 'CANDIDATE' ? 'active-candidate' : ''}`}
                title="Switch to Candidate Portal with 3D Flip"
              >
                <User size={18} color={selectedRole === 'CANDIDATE' ? '#FFF' : '#38bdf8'} />
                <span>Candidate</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('HR')}
                className={`login-role-tab ${selectedRole === 'HR' ? 'active-hr' : ''}`}
                title="Switch to HR Recruiter Portal with 3D Flip"
              >
                <Building2 size={18} color={selectedRole === 'HR' ? '#FFF' : '#818cf8'} />
                <span>HR Recruiter</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('ADMIN')}
                className={`login-role-tab ${selectedRole === 'ADMIN' ? 'active-admin' : ''}`}
                title="Switch to Super Admin Portal with 3D Flip"
              >
                <ShieldCheck size={18} color={selectedRole === 'ADMIN' ? '#FFF' : '#fb7185'} />
                <span>Admin</span>
              </button>
            </div>

            {/* Selected Role Context Banner */}
            <div className={`login-role-banner ${selectedRole.toLowerCase()}`}>
              {selectedRole === 'CANDIDATE' && (
                <>🎯 Logging in as <strong>Candidate</strong> — AI resume scoring, job applications & portfolio showcase.</>
              )}
              {selectedRole === 'HR' && (
                <>🏢 Logging in as <strong>HR Recruiter</strong> — Job posting modal, RAG AI Copilot & candidate analytics.</>
              )}
              {selectedRole === 'ADMIN' && (
                <>🛡️ Logging in as <strong>Super Admin</strong> — User lockouts, company verification & platform telemetry.</>
              )}
            </div>

            {error && (
              <div className="login-error-alert">
                ⚠️ {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="login-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="login-label">Email Address</label>
                  <span style={{ fontSize: '11px', color: '#38BDF8' }}>Must end with @gmail.com</span>
                </div>
                <input
                  type="email"
                  className="login-input"
                  placeholder={
                    selectedRole === 'HR'
                      ? 'recruiter.hr@gmail.com'
                      : selectedRole === 'ADMIN'
                      ? 'admin.talentiq@gmail.com'
                      : 'candidate.alex@gmail.com'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="login-form-group">
                <label className="login-label">Password</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className={`login-submit-btn ${selectedRole.toLowerCase()}`}
                disabled={loading}
              >
                {loading ? (
                  'Authenticating...'
                ) : (
                  <span className="login-btn-content">
                    <LogIn size={17} /> Sign In as{' '}
                    {selectedRole === 'CANDIDATE'
                      ? 'Candidate'
                      : selectedRole === 'HR'
                      ? 'HR Recruiter'
                      : 'Super Admin'}{' '}
                    <ArrowRight size={15} />
                  </span>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 6px', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
                <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
              </div>

              <GoogleAuthButton
                role={selectedRole === 'HR' ? 'ROLE_HR' : 'ROLE_CANDIDATE'}
                label={`Continue with Google as ${selectedRole === 'HR' ? 'HR' : 'Candidate'}`}
                onError={setError}
              />
            </form>

            {/* 3D Flip Action Switcher Footer */}
            <div className="login-flip-footer">
              <button
                type="button"
                onClick={toggleAuthCardMode}
                className="login-flip-toggle-btn"
              >
                <RefreshCw size={14} className="flip-icon-spin" />
                Don't have an account? <strong>3D Flip to Register</strong> ↺
              </button>
            </div>
          </div>

          {/* ============================================================
              BACK FACE: 3D FLIP QUICK REGISTER
             ============================================================ */}
          <div className="card-face card-face-back">
            {/* Header */}
            <div className="login-header">
              <div className="login-icon-badge">
                <UserPlus size={28} color="#FFF" />
              </div>
              <h2 className="login-title">Create Account</h2>
              <p className="login-subtitle">
                3D Fast Onboarding for {selectedRole === 'HR' ? 'HR Recruiters' : 'Candidates'}
              </p>
            </div>

            {/* Role Toggle for Registration */}
            <div className="login-role-tabs">
              <button
                type="button"
                onClick={() => handleRoleSelect('CANDIDATE')}
                className={`login-role-tab ${selectedRole === 'CANDIDATE' ? 'active-candidate' : ''}`}
              >
                <User size={18} color={selectedRole === 'CANDIDATE' ? '#FFF' : '#38bdf8'} />
                <span>Candidate</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('HR')}
                className={`login-role-tab ${selectedRole === 'HR' ? 'active-hr' : ''}`}
              >
                <Building2 size={18} color={selectedRole === 'HR' ? '#FFF' : '#818cf8'} />
                <span>HR Recruiter</span>
              </button>
            </div>

            {regError && (
              <div className="login-error-alert">
                ⚠️ {regError}
              </div>
            )}

            {/* Quick Register Form */}
            <form onSubmit={handleRegisterSubmit} className="login-form">
              <div className="login-grid-2col">
                <div className="login-form-group">
                  <label className="login-label">First Name *</label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Jane"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="login-form-group">
                  <label className="login-label">Last Name *</label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Doe"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-label">Email Address *</label>
                <input
                  type="email"
                  className="login-input"
                  placeholder={selectedRole === 'HR' ? 'recruiter@company.com' : 'candidate@example.com'}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              {selectedRole === 'HR' ? (
                <div className="login-form-group">
                  <label className="login-label">Company Name *</label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="TechCorp Innovations"
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="login-form-group">
                  <label className="login-label">Desired Job Title *</label>
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Full Stack Engineer / AI Specialist"
                    value={regDesiredRole}
                    onChange={(e) => setRegDesiredRole(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="login-form-group">
                <label className="login-label">Password * (min 8 chars)</label>
                <input
                  type="password"
                  className="login-input"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className={`login-submit-btn ${selectedRole.toLowerCase()}`}
                disabled={regLoading}
              >
                {regLoading ? (
                  'Creating Account...'
                ) : (
                  <span className="login-btn-content">
                    <UserPlus size={17} /> Create {selectedRole === 'HR' ? 'HR Recruiter' : 'Candidate'} Account 🚀
                  </span>
                )}
              </button>
            </form>

            {/* Flip Back to Login Button */}
            <div className="login-flip-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={toggleAuthCardMode}
                className="login-flip-toggle-btn"
              >
                <RefreshCw size={14} className="flip-icon-spin" />
                <strong>3D Flip back to Sign In</strong> ↻
              </button>

              <Link
                to="/register"
                style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'underline' }}
              >
                Full Setup →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
