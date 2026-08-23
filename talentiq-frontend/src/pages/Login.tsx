import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Sparkles,
  User,
  Building2,
  ShieldCheck,
  LogIn,
  ArrowRight,
  RefreshCw,
  UserPlus,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import MilkyWay3DCanvas from '../components/MilkyWay3DCanvas';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import '../css/login.css';

type LoginRoleMode = 'CANDIDATE' | 'HR' | 'ADMIN';
type AuthCardMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

interface LoginProps {
  initialRole?: LoginRoleMode;
}

export const Login: React.FC<LoginProps> = ({ initialRole }) => {
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getRoleFromPath = (): LoginRoleMode => {
    if (location.pathname === '/hr-login') return 'HR';
    if (location.pathname === '/admin-login') return 'ADMIN';
    if (initialRole) return initialRole;
    return 'CANDIDATE';
  };

  const [authCardMode, setAuthCardMode] = useState<AuthCardMode>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<LoginRoleMode>(getRoleFromPath);
  const [flippingClass, setFlippingClass] = useState<string>('');

  useEffect(() => {
    const roleFromUrl = getRoleFromPath();
    if (roleFromUrl !== selectedRole) {
      setSelectedRole(roleFromUrl);
    }
  }, [location.pathname, initialRole]);

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

  // Forgot Password Multi-Step State
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3 | 4>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setForgotError('');
    if (char && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      if (pasted.length === 4) {
        otpRefs[3].current?.focus();
      } else {
        otpRefs[pasted.length].current?.focus();
      }
    }
  };

  // ── Trigger 3D Super Motion Flip when switching Role Tabs & Sync URL ──
  const handleRoleSelect = (role: LoginRoleMode) => {
    if (role === selectedRole) return;

    const animClass =
      role === 'HR'
        ? 'flipping-role-hr'
        : role === 'CANDIDATE'
        ? 'flipping-role-candidate'
        : 'flipping-role-admin';

    setFlippingClass(animClass);
    setSelectedRole(role);
    setError('');

    if (role === 'HR' && location.pathname !== '/hr-login') {
      navigate('/hr-login');
    } else if (role === 'ADMIN' && location.pathname !== '/admin-login') {
      navigate('/admin-login');
    } else if (role === 'CANDIDATE' && location.pathname !== '/login') {
      navigate('/login');
    }

    setTimeout(() => {
      setFlippingClass('');
    }, 750);
  };

  // ── Trigger 180° 3D Card Flip between Login & Register ──
  const toggleAuthCardMode = () => {
    setError('');
    setRegError('');
    setForgotError('');
    setForgotSuccess('');
    setAuthCardMode((prev) => (prev === 'LOGIN' ? 'REGISTER' : 'LOGIN'));
  };

  // ── Switch to Forgot Password Mode ──
  const openForgotPassword = () => {
    setForgotEmail(email);
    setForgotStep(1);
    setOtpDigits(['', '', '', '']);
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
    setAuthCardMode('FORGOT_PASSWORD');
  };

  // ── Handle Login Submit ──
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const targetRole = selectedRole === 'HR'
        ? 'ROLE_HR'
        : (selectedRole === 'ADMIN' ? 'ROLE_SUPER_ADMIN' : 'ROLE_CANDIDATE');

      await login({ email: trimmedEmail, password, requiredRole: targetRole });

      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const roles: string[] = savedUser.roles || [];

      const userIsHr = roles.includes('ROLE_HR') || roles.includes('HR');
      const userIsAdmin = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('SUPER_ADMIN') || roles.includes('ROLE_PLATFORM_ADMIN');
      const userIsCandidate = roles.includes('ROLE_CANDIDATE') || roles.includes('CANDIDATE');

      if (selectedRole === 'HR') {
        if (!userIsHr && !userIsAdmin) {
          logout();
          setError('Invalid email or password');
          return;
        }
        navigate('/hr-analytics');
      } else if (selectedRole === 'ADMIN') {
        if (!userIsAdmin) {
          logout();
          setError('Invalid email or password');
          return;
        }
        navigate('/admin');
      } else {
        if (!userIsCandidate && !userIsAdmin) {
          logout();
          setError('Invalid email or password');
          return;
        }
        navigate('/jobs');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Quick Registration on Back Face ──
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    const trimmedEmail = regEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (!regPassword || regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }
    setRegLoading(true);
    try {
      if (selectedRole === 'HR') {
        await register({
          firstName: regFirstName,
          lastName: regLastName,
          email: trimmedEmail,
          password: regPassword,
          role: 'ROLE_HR',
          companyName: regCompany || 'Enterprise Talent Corp',
          jobTitle: 'Recruitment Lead',
        });
        navigate('/hr-analytics');
      } else {
        await register({
          firstName: regFirstName,
          lastName: regLastName,
          email: trimmedEmail,
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

  // ── Step 1: Request 4-Digit OTP ──
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: targetEmail });
      setForgotSuccess(res.data?.message || '4-digit OTP code sent to your email!');
      setForgotStep(2);
      setResendCountdown(60);
      setTimeout(() => otpRefs[0].current?.focus(), 150);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Failed to send OTP. Please verify your email.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 2: Verify 4-Digit OTP ──
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    const otp = otpDigits.join('');
    if (otp.length !== 4) {
      setForgotError('Please enter all 4 digits of your OTP code.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-otp', {
        email: forgotEmail.trim().toLowerCase(),
        otp
      });
      setForgotSuccess(res.data?.message || 'OTP Verified! Please create your new password.');
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Invalid or expired 4-digit OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 3: Reset & Set New Password ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (forgotNewPassword.length < 8) {
      setForgotError('Password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await apiClient.post('/auth/reset-password', {
        email: forgotEmail.trim().toLowerCase(),
        otp: otpDigits.join(''),
        newPassword: forgotNewPassword
      });
      setForgotSuccess(res.data?.message || 'Password reset successfully!');
      setForgotStep(4);
      setEmail(forgotEmail.trim().toLowerCase());
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setForgotLoading(false);
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
              FRONT FACE: SIGN IN OR FORGOT PASSWORD
             ============================================================ */}
          <div className="card-face card-face-front">
            {authCardMode === 'FORGOT_PASSWORD' ? (
              /* ── FORGOT PASSWORD MULTI-STEP RECOVERY VIEW ── */
              <div className="forgot-password-view">
                {/* Header */}
                <div className="login-header">
                  <div className="login-icon-badge" style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                    <KeyRound size={26} color="#FFF" />
                  </div>
                  <h2 className="login-title">Reset Password</h2>
                  <p className="login-subtitle">HireMind 4-Digit Email OTP Verification</p>
                </div>

                {/* Step Indicator Pills */}
                <div className="forgot-step-pills">
                  <div className={`forgot-step-pill ${forgotStep === 1 ? 'active' : forgotStep > 1 ? 'completed' : ''}`}>
                    <span>1</span> Email
                  </div>
                  <div className={`forgot-step-pill ${forgotStep === 2 ? 'active' : forgotStep > 2 ? 'completed' : ''}`}>
                    <span>2</span> 4-Digit OTP
                  </div>
                  <div className={`forgot-step-pill ${forgotStep >= 3 ? 'active' : ''}`}>
                    <span>3</span> New Password
                  </div>
                </div>

                {forgotError && (
                  <div className="login-error-alert">
                    ⚠️ {forgotError}
                  </div>
                )}

                {forgotSuccess && (
                  <div className="login-success-alert">
                    <CheckCircle2 size={16} /> {forgotSuccess}
                  </div>
                )}

                {/* ── Step 1: Enter Email ── */}
                {forgotStep === 1 && (
                  <form onSubmit={handleSendOtp} className="login-form">
                    <div className="login-form-group">
                      <label className="login-label">Enter Registered Email</label>
                      <input
                        type="email"
                        className="login-input"
                        placeholder="you@gmail.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      className="login-submit-btn hr"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        'Sending OTP...'
                      ) : (
                        <span className="login-btn-content">
                          <Mail size={17} /> Send 4-Digit OTP Code <ArrowRight size={15} />
                        </span>
                      )}
                    </button>
                  </form>
                )}

                {/* ── Step 2: Enter 4-Digit OTP ── */}
                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyOtp} className="login-form">
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: '#94A3B8' }}>
                        Enter the 4-digit code sent to <strong style={{ color: '#38BDF8' }}>{forgotEmail}</strong>
                      </span>
                    </div>

                    {/* 4 Digit Boxes */}
                    <div className="otp-boxes-container">
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={otpRefs[index]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          className="otp-box-input"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onPaste={handleOtpPaste}
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="login-submit-btn candidate"
                      disabled={forgotLoading || otpDigits.join('').length !== 4}
                      style={{ marginTop: 12 }}
                    >
                      {forgotLoading ? (
                        'Verifying OTP...'
                      ) : (
                        <span className="login-btn-content">
                          <CheckCircle2 size={17} /> Verify OTP Code <ArrowRight size={15} />
                        </span>
                      )}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={resendCountdown > 0 || forgotLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: resendCountdown > 0 ? '#64748B' : '#818CF8',
                          fontSize: '12px',
                          cursor: resendCountdown > 0 ? 'default' : 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {resendCountdown > 0
                          ? `Resend OTP code in ${resendCountdown}s`
                          : "Didn't receive code? Resend 4-Digit OTP"}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Step 3: Enter New Password ── */}
                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="login-form">
                    <div className="login-form-group">
                      <label className="login-label">New Password (min 8 chars)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className="login-input"
                          placeholder="Enter new password"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          required
                          autoFocus
                          style={{ paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((s) => !s)}
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer'
                          }}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="login-form-group">
                      <label className="login-label">Confirm New Password</label>
                      <input
                        type="password"
                        className="login-input"
                        placeholder="Re-enter new password"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="login-submit-btn admin"
                      disabled={forgotLoading}
                      style={{ marginTop: 8 }}
                    >
                      {forgotLoading ? (
                        'Updating Password...'
                      ) : (
                        <span className="login-btn-content">
                          <Lock size={17} /> Reset & Set New Password <ArrowRight size={15} />
                        </span>
                      )}
                    </button>
                  </form>
                )}

                {/* ── Step 4: Success View ── */}
                {forgotStep === 4 && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.15)', border: '2px solid #34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <CheckCircle2 size={36} color="#34D399" />
                    </div>
                    <h3 style={{ color: '#F8FAFC', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Password Reset Complete!</h3>
                    <p style={{ color: '#94A3B8', fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>
                      Your password has been securely updated. All previous tokens and active sessions have been invalidated.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAuthCardMode('LOGIN')}
                      className="login-submit-btn candidate"
                    >
                      <span className="login-btn-content">
                        <LogIn size={17} /> Sign In with New Password <ArrowRight size={15} />
                      </span>
                    </button>
                  </div>
                )}

                {/* Back to Sign In Link */}
                {forgotStep !== 4 && (
                  <div style={{ textAlign: 'center', marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => setAuthCardMode('LOGIN')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <ArrowLeft size={15} /> Back to Sign In
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── STANDARD SIGN IN VIEW ── */
              <>
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
                      <span style={{ fontSize: '11px', color: '#38BDF8' }}>
                        {selectedRole === 'ADMIN' ? 'Must end with @gmail.com or @talentiq.ai' : 'Must end with @gmail.com'}
                      </span>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="login-label">Password</label>
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#818CF8',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: 0
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
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

                {/* Quick Portal Direct Links */}
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>Switch Portal:</span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {selectedRole !== 'CANDIDATE' && (
                      <Link to="/login" onClick={() => handleRoleSelect('CANDIDATE')} style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 600 }}>
                        👤 Candidate (/login)
                      </Link>
                    )}
                    {selectedRole !== 'HR' && (
                      <Link to="/hr-login" onClick={() => handleRoleSelect('HR')} style={{ color: '#818CF8', textDecoration: 'none', fontWeight: 600 }}>
                        🏢 HR Recruiter (/hr-login)
                      </Link>
                    )}
                    {selectedRole !== 'ADMIN' && (
                      <Link to="/admin-login" onClick={() => handleRoleSelect('ADMIN')} style={{ color: '#FB7185', textDecoration: 'none', fontWeight: 600 }}>
                        🛡️ Admin (/admin-login)
                      </Link>
                    )}
                  </div>
                </div>

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
              </>
            )}
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

