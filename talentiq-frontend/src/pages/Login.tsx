import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
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
  EyeOff,
  ChevronDown
} from 'lucide-react';
import MilkyWay3DCanvas from '../components/MilkyWay3DCanvas';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { HireMindLogo } from '../components/HireMindLogo';
import '../css/login.css';

export type LoginRole =
  | 'ROLE_CANDIDATE'
  | 'ROLE_HR'
  | 'ROLE_COMPANY_ADMIN'
  | 'ROLE_APP_DEVELOPER'
  | 'ROLE_MANAGEMENT_TEAM'
  | 'ROLE_SUPER_ADMIN';

export interface RoleOption {
  role: LoginRole;
  label: string;
  category: 'Candidate' | 'Recruiter' | 'Enterprise Leadership' | 'Engineering & Ops';
  tag: string;
  desc: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'ROLE_APP_DEVELOPER',
    label: 'Application Developer',
    category: 'Engineering & Ops',
    tag: 'Safe DB Guard • Full Control',
    desc: 'Develop & test HireMind-AI, trigger AI agents, diagnostic telemetry with database drop protection.'
  },
  {
    role: 'ROLE_MANAGEMENT_TEAM',
    label: 'HireMind-Management Team',
    category: 'Enterprise Leadership',
    tag: 'Platform Governance & Metrics',
    desc: 'Candidate & HR moderation, company blacklisting, and temporal job metrics (Today/Week/Month/Year).'
  },
  {
    role: 'ROLE_COMPANY_ADMIN',
    label: 'Register Company (CEO / Executive)',
    category: 'Enterprise Leadership',
    tag: 'Multi-Tenant Corporate Portal',
    desc: 'Manage company talent pipeline and review & approve candidate verification badge requests.'
  },
  {
    role: 'ROLE_SUPER_ADMIN',
    label: 'Super Administrator',
    category: 'Enterprise Leadership',
    tag: 'Executive Master Control',
    desc: 'Full global system administration, policy configuration, and access controls.'
  },
  {
    role: 'ROLE_HR',
    label: 'HR Recruiter / Talent Partner',
    category: 'Recruiter',
    tag: 'Talent Acquisition & AI Copilot',
    desc: 'Post job openings, manage candidates, leverage AI screening & request company-verified tags.'
  },
  {
    role: 'ROLE_CANDIDATE',
    label: 'Candidate / Job Seeker',
    category: 'Candidate',
    tag: 'AI Portfolio & Smart Matching',
    desc: 'Explore jobs, receive automated AI job matches, showcase credentials & chat with recruiters.'
  }
];

type AuthCardMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

interface LoginProps {
  initialRole?: 'CANDIDATE' | 'HR' | 'ADMIN';
}

export const Login: React.FC<LoginProps> = ({ initialRole }) => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialRole = (): LoginRole => {
    if (location.pathname === '/hr-login') return 'ROLE_HR';
    if (location.pathname === '/admin-login') return 'ROLE_MANAGEMENT_TEAM';
    if (initialRole === 'HR') return 'ROLE_HR';
    if (initialRole === 'ADMIN') return 'ROLE_SUPER_ADMIN';
    return 'ROLE_CANDIDATE';
  };

  const [authCardMode, setAuthCardMode] = useState<AuthCardMode>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<LoginRole>(getInitialRole);
  const [flippingClass, setFlippingClass] = useState<string>('');

  useEffect(() => {
    const roleFromUrl = getInitialRole();
    if (roleFromUrl !== selectedRole && location.pathname !== '/login') {
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
  const [regJobTitle, setRegJobTitle] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('');
  const [regYearsExperience, setRegYearsExperience] = useState('3');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [regOtpDigits, setRegOtpDigits] = useState<string[]>(['', '', '', '']);
  const [regResendCountdown, setRegResendCountdown] = useState(0);

  const regOtpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

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

  const currentRoleInfo = ROLE_OPTIONS.find(r => r.role === selectedRole) || ROLE_OPTIONS[0];

  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    let timer: any;
    if (regResendCountdown > 0) {
      timer = setTimeout(() => setRegResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [regResendCountdown]);

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

  // ── Role Select via Dropdown ──
  const handleRoleChange = (newRole: LoginRole) => {
    if (newRole === selectedRole) return;

    const animClass =
      newRole === 'ROLE_HR'
        ? 'flipping-role-hr'
        : newRole === 'ROLE_CANDIDATE'
        ? 'flipping-role-candidate'
        : 'flipping-role-admin';

    setFlippingClass(animClass);
    setSelectedRole(newRole);
    setError('');

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
      await login({ email: trimmedEmail, password, requiredRole: selectedRole });

      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const roles: string[] = savedUser.roles || [];

      const isDev = roles.includes('ROLE_APP_DEVELOPER');
      const isMgmt = roles.includes('ROLE_MANAGEMENT_TEAM');
      const isCompAdmin = roles.includes('ROLE_COMPANY_ADMIN');
      const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_PLATFORM_ADMIN') || roles.includes('SUPER_ADMIN');
      const userIsHr = roles.includes('ROLE_HR') || roles.includes('HR');
      const userIsCandidate = roles.includes('ROLE_CANDIDATE') || roles.includes('CANDIDATE');

      if (selectedRole === 'ROLE_HR') {
        if (!userIsHr && !isSuperAdmin) {
          logout();
          setError('Invalid email or credentials for HR Recruiter.');
          return;
        }
        navigate('/hr-analytics');
      } else if (
        selectedRole === 'ROLE_APP_DEVELOPER' ||
        selectedRole === 'ROLE_MANAGEMENT_TEAM' ||
        selectedRole === 'ROLE_COMPANY_ADMIN' ||
        selectedRole === 'ROLE_SUPER_ADMIN'
      ) {
        if (!isDev && !isMgmt && !isCompAdmin && !isSuperAdmin) {
          logout();
          setError('Access denied: Unauthorized role credentials.');
          return;
        }
        navigate('/admin');
      } else {
        if (!userIsCandidate && !isSuperAdmin) {
          logout();
          setError('Invalid email or credentials for Candidate.');
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

  const handleRegOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...regOtpDigits];
    newDigits[index] = char;
    setRegOtpDigits(newDigits);
    setRegError('');
    if (char && index < 3) {
      regOtpRefs[index + 1].current?.focus();
    }
  };

  const handleRegOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !regOtpDigits[index] && index > 0) {
      regOtpRefs[index - 1].current?.focus();
    }
  };

  const handleRegOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setRegOtpDigits(newDigits);
      if (pasted.length === 4) {
        regOtpRefs[3].current?.focus();
      } else {
        regOtpRefs[pasted.length].current?.focus();
      }
    }
  };

  // ── Step 1: Send Registration OTP ──
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    const trimmedEmail = regEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (!regFirstName.trim() || !regLastName.trim()) {
      setRegError('Please enter both your first and last name.');
      return;
    }
    if (!regPassword || regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }
    setRegLoading(true);
    try {
      await apiClient.post('/auth/register/send-otp', {
        email: trimmedEmail,
        firstName: regFirstName.trim(),
        role: selectedRole
      });
      setRegStep(2);
      setRegResendCountdown(60);
      setTimeout(() => regOtpRefs[0].current?.focus(), 200);
    } catch (err: any) {
      setRegError(err?.response?.data?.message || err?.message || 'Failed to dispatch verification code. Please check your email.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleResendRegOtp = async () => {
    if (regResendCountdown > 0 || regLoading) return;
    setRegError('');
    setRegLoading(true);
    try {
      await apiClient.post('/auth/register/send-otp', {
        email: regEmail.trim().toLowerCase(),
        firstName: regFirstName.trim(),
        role: selectedRole
      });
      setRegResendCountdown(60);
    } catch (err: any) {
      setRegError(err?.response?.data?.message || err?.message || 'Failed to resend code');
    } finally {
      setRegLoading(false);
    }
  };

  // ── Step 2: Final Verify & Create Account ──
  const handleRegVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = regOtpDigits.join('');
    if (otpCode.length !== 4) {
      setRegError('Please enter the full 4-digit code.');
      return;
    }
    setRegError('');
    setRegLoading(true);

    try {
      const payload: any = {
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: selectedRole,
        otp: otpCode
      };

      if (selectedRole === 'ROLE_HR' || selectedRole === 'ROLE_COMPANY_ADMIN') {
        payload.companyName = regCompany.trim() || 'Enterprise Partner';
        payload.jobTitle = regJobTitle.trim() || (selectedRole === 'ROLE_COMPANY_ADMIN' ? 'Managing Director' : 'Lead Recruiter');
      } else if (selectedRole === 'ROLE_APP_DEVELOPER' || selectedRole === 'ROLE_MANAGEMENT_TEAM') {
        payload.specialization = regSpecialization.trim() || 'Platform Systems & AI';
      } else {
        payload.desiredRole = regJobTitle.trim() || 'Software Engineer';
        payload.yearsExperience = parseInt(regYearsExperience, 10) || 3;
      }

      await apiClient.post('/auth/register', payload);

      await login({
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        requiredRole: selectedRole
      });

      if (selectedRole === 'ROLE_HR') {
        navigate('/hr-analytics');
      } else if (
        selectedRole === 'ROLE_APP_DEVELOPER' ||
        selectedRole === 'ROLE_MANAGEMENT_TEAM' ||
        selectedRole === 'ROLE_COMPANY_ADMIN' ||
        selectedRole === 'ROLE_SUPER_ADMIN'
      ) {
        navigate('/admin');
      } else {
        navigate('/jobs');
      }
    } catch (err: any) {
      setRegError(err?.response?.data?.message || err?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // ── Forgot Password Step 1: Send OTP ──
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError('');
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: trimmed });
      setForgotStep(2);
      setResendCountdown(60);
      setTimeout(() => otpRefs[0].current?.focus(), 200);
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot Password Step 2: Verify OTP ──
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 4) {
      setForgotError('Please enter the complete 4-digit code.');
      return;
    }
    setForgotError('');
    setForgotLoading(true);
    try {
      await apiClient.post('/auth/verify-reset-otp', {
        email: forgotEmail.trim().toLowerCase(),
        otp: otpCode
      });
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot Password Step 3: Reset Password ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (forgotNewPassword.length < 8) {
      setForgotError('Password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    setForgotLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: forgotEmail.trim().toLowerCase(),
        otp: otpDigits.join(''),
        newPassword: forgotNewPassword
      });
      setForgotStep(4);
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || 'Failed to update password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* 3D Celestial Milky Way Canvas Background */}
      <MilkyWay3DCanvas />

      {/* 3D Perspective Stage Container */}
      <div className="login-3d-perspective-stage">
        <div
          className={`login-3d-flipper ${
            authCardMode === 'REGISTER' ? 'is-register-flipped' : ''
          } ${flippingClass}`}
        >
          {/* ============================================================
              FRONT FACE: SIGN IN & FORGOT PASSWORD
             ============================================================ */}
          <div className="card-face card-face-front">
            {authCardMode === 'FORGOT_PASSWORD' ? (
              /* ── FORGOT PASSWORD RECOVERY ── */
              <div className="forgot-pw-container">
                <div className="login-header">
                  <div className="login-icon-badge forgot">
                    <KeyRound size={28} color="#FFF" />
                  </div>
                  <h2 className="login-title">Reset Password</h2>
                  <p className="login-subtitle">
                    {forgotStep === 1 && 'Enter your registered email to receive a 4-digit code'}
                    {forgotStep === 2 && 'Enter the 4-digit code sent to your email'}
                    {forgotStep === 3 && 'Choose a strong new password (min 8 characters)'}
                    {forgotStep === 4 && 'Your password has been reset successfully!'}
                  </p>
                </div>

                <div className="forgot-progress-pills">
                  <div className={`forgot-step-pill ${forgotStep >= 1 ? 'active' : ''}`}>
                    <span>1</span> Email
                  </div>
                  <div className={`forgot-step-pill ${forgotStep >= 2 ? 'active' : ''}`}>
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

                {/* Step 1: Enter Email */}
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

                {/* Step 2: Enter 4-Digit OTP */}
                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyOtp} className="login-form">
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: '#94A3B8' }}>
                        Enter the 4-digit code sent to <strong style={{ color: '#38BDF8' }}>{forgotEmail}</strong>
                      </span>
                    </div>

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

                {/* Step 3: Enter New Password */}
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

                {/* Step 4: Success View */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <HireMindLogo variant="navbar" size="lg" showTagline={true} />
                  </div>
                  <h2 className="login-title">Sign In to HireMind-AI</h2>
                  <p className="login-subtitle">Select your role from the list below</p>
                </div>

                {/* Role Dropdown Selector */}
                <div className="login-role-dropdown-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Select Login Role / Account Type
                    </label>
                    <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>
                      {currentRoleInfo.tag}
                    </span>
                  </div>

                  <div className="login-role-dropdown-wrapper">
                    <select
                      className="login-role-select"
                      value={selectedRole}
                      onChange={(e) => handleRoleChange(e.target.value as LoginRole)}
                    >
                      <optgroup label="── Candidates & Recruiters ──">
                        <option value="ROLE_CANDIDATE">👤 Candidate / Job Seeker</option>
                        <option value="ROLE_HR">🏢 HR Recruiter / Talent Partner</option>
                      </optgroup>
                      <optgroup label="── Enterprise Leadership & Admin ──">
                        <option value="ROLE_COMPANY_ADMIN">🏛️ Register Company (CEO / Executive)</option>
                        <option value="ROLE_MANAGEMENT_TEAM">🛡️ HireMind-Management Team</option>
                        <option value="ROLE_SUPER_ADMIN">⚡ Super Administrator</option>
                      </optgroup>
                      <optgroup label="── Engineering & AI Systems ──">
                        <option value="ROLE_APP_DEVELOPER">💻 Application Developer (Safe DB Guard)</option>
                      </optgroup>
                    </select>
                    <ChevronDown
                      size={18}
                      color="#38BDF8"
                      style={{ position: 'absolute', right: 14, pointerEvents: 'none' }}
                    />
                  </div>
                </div>

                {/* Selected Role Context Banner */}
                <div className="login-role-banner hr" style={{ borderLeftColor: '#38BDF8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <strong style={{ color: '#FFFFFF', fontSize: '13px' }}>{currentRoleInfo.label}</strong>
                  </div>
                  <span style={{ fontSize: '12px', color: '#CBD5E1' }}>{currentRoleInfo.desc}</span>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="login-error-alert">
                    ⚠️ {error}
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLoginSubmit} className="login-form">
                  <div className="login-form-group">
                    <label className="login-label">Email Address</label>
                    <input
                      type="email"
                      className="login-input"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="login-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="login-label">Password</label>
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className="login-forgot-link"
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
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    className="login-submit-btn hr"
                    disabled={loading}
                  >
                    {loading ? (
                      'Authenticating...'
                    ) : (
                      <span className="login-btn-content">
                        <LogIn size={18} /> Sign In as {currentRoleInfo.label} <ArrowRight size={16} />
                      </span>
                    )}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 6px', gap: '10px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
                    <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
                  </div>

                  <GoogleAuthButton
                    role={(selectedRole === 'ROLE_HR' || selectedRole === 'ROLE_COMPANY_ADMIN') ? 'ROLE_HR' : 'ROLE_CANDIDATE'}
                    label={`Sign In with Google as ${currentRoleInfo.label}`}
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
                    Don't have an account? <strong>Create New Account</strong> ↺
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ============================================================
              BACK FACE: 3D FLIP QUICK REGISTER WITH ROLE DROPDOWN
             ============================================================ */}
          <div className="card-face card-face-back">
            <div className="login-header">
              <div className="login-icon-badge">
                <UserPlus size={28} color="#FFF" />
              </div>
              <h2 className="login-title">Create Account</h2>
              <p className="login-subtitle">
                Select your account role from the dropdown
              </p>
            </div>

            {/* Role Dropdown Selector for Registration */}
            <div className="login-role-dropdown-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Choose Role / Account Type
                </label>
                <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>
                  {currentRoleInfo.tag}
                </span>
              </div>

              <div className="login-role-dropdown-wrapper">
                <select
                  className="login-role-select"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value as LoginRole)}
                >
                  <optgroup label="── Candidates & Recruiters ──">
                    <option value="ROLE_CANDIDATE">👤 Candidate / Job Seeker</option>
                    <option value="ROLE_HR">🏢 HR Recruiter / Talent Partner</option>
                  </optgroup>
                  <optgroup label="── Enterprise Leadership & Admin ──">
                    <option value="ROLE_COMPANY_ADMIN">🏛️ Register Company (CEO / Executive)</option>
                    <option value="ROLE_MANAGEMENT_TEAM">🛡️ HireMind-Management Team</option>
                    <option value="ROLE_SUPER_ADMIN">⚡ Super Administrator</option>
                  </optgroup>
                  <optgroup label="── Engineering & AI Systems ──">
                    <option value="ROLE_APP_DEVELOPER">💻 Application Developer (Safe DB Guard)</option>
                  </optgroup>
                </select>
                <ChevronDown
                  size={18}
                  color="#38BDF8"
                  style={{ position: 'absolute', right: 14, pointerEvents: 'none' }}
                />
              </div>
            </div>

            {regError && (
              <div className="login-error-alert">
                ⚠️ {regError}
              </div>
            )}

            {/* Quick Register Form (Step 1: Info -> Step 2: OTP) */}
            {regStep === 1 ? (
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
                    placeholder="user@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Adaptive Fields based on Role */}
                {(selectedRole === 'ROLE_HR' || selectedRole === 'ROLE_COMPANY_ADMIN') && (
                  <div className="login-grid-2col">
                    <div className="login-form-group">
                      <label className="login-label">Company Name *</label>
                      <input
                        type="text"
                        className="login-input"
                        placeholder="TechCorp Global"
                        value={regCompany}
                        onChange={(e) => setRegCompany(e.target.value)}
                        required
                      />
                    </div>
                    <div className="login-form-group">
                      <label className="login-label">Corporate Title *</label>
                      <input
                        type="text"
                        className="login-input"
                        placeholder={selectedRole === 'ROLE_COMPANY_ADMIN' ? 'Managing Director' : 'Lead Recruiter'}
                        value={regJobTitle}
                        onChange={(e) => setRegJobTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {(selectedRole === 'ROLE_APP_DEVELOPER' || selectedRole === 'ROLE_MANAGEMENT_TEAM') && (
                  <div className="login-form-group">
                    <label className="login-label">Technical / Governance Specialization *</label>
                    <input
                      type="text"
                      className="login-input"
                      placeholder={selectedRole === 'ROLE_APP_DEVELOPER' ? 'e.g. Distributed Systems & AI Agents' : 'e.g. Platform Operations & Moderation'}
                      value={regSpecialization}
                      onChange={(e) => setRegSpecialization(e.target.value)}
                      required
                    />
                  </div>
                )}

                {selectedRole === 'ROLE_CANDIDATE' && (
                  <div className="login-grid-2col">
                    <div className="login-form-group">
                      <label className="login-label">Desired Job Title *</label>
                      <input
                        type="text"
                        className="login-input"
                        placeholder="Full Stack Engineer"
                        value={regJobTitle}
                        onChange={(e) => setRegJobTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="login-form-group">
                      <label className="login-label">Years of Experience</label>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        className="login-input"
                        placeholder="3"
                        value={regYearsExperience}
                        onChange={(e) => setRegYearsExperience(e.target.value)}
                      />
                    </div>
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
                  className="login-submit-btn hr"
                  disabled={regLoading}
                >
                  {regLoading ? (
                    'Sending Verification Code...'
                  ) : (
                    <span className="login-btn-content">
                      <UserPlus size={17} /> Verify Email & Create Account →
                    </span>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: 4-Digit Email OTP Verification */
              <form onSubmit={handleRegVerifySubmit} className="login-form">
                <div style={{ textAlign: 'center', padding: '6px 0 12px' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38BDF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px'
                  }}>
                    <ShieldCheck size={26} color="#38BDF8" />
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 4px', lineHeight: 1.4 }}>
                    Enter the 4-digit code sent to
                  </p>
                  <strong style={{ color: '#F8FAFC', fontSize: '14px' }}>{regEmail}</strong>

                  {/* 4-Digit OTP Inputs */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '16px 0' }}>
                    {regOtpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={regOtpRefs[idx]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-box-input"
                        value={digit}
                        onChange={(e) => handleRegOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleRegOtpKeyDown(idx, e)}
                        onPaste={handleRegOtpPaste}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="login-submit-btn candidate"
                    disabled={regLoading || regOtpDigits.join('').length !== 4}
                  >
                    {regLoading ? (
                      'Activating Account...'
                    ) : (
                      <span className="login-btn-content">
                        <CheckCircle2 size={17} /> Confirm OTP & Launch Dashboard <ArrowRight size={15} />
                      </span>
                    )}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={handleResendRegOtp}
                      disabled={regResendCountdown > 0 || regLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: regResendCountdown > 0 ? '#64748B' : '#38BDF8',
                        fontSize: '12px',
                        cursor: regResendCountdown > 0 ? 'default' : 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {regResendCountdown > 0
                        ? `Resend code in ${regResendCountdown}s`
                        : "Didn't receive code? Resend 4-Digit OTP"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Back to Sign In Link */}
            <div className="login-flip-footer">
              <button
                type="button"
                onClick={toggleAuthCardMode}
                className="login-flip-toggle-btn"
              >
                <RefreshCw size={14} className="flip-icon-spin" />
                Already have an account? <strong>Sign In</strong> ↺
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
