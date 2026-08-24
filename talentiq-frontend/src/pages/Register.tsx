import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Building2, CheckCircle2, ArrowRight, Eye, EyeOff, ShieldCheck,
  RefreshCw, Code2, Users2, ChevronDown
} from 'lucide-react';
import MilkyWay3DCanvas from '../components/MilkyWay3DCanvas';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { HireMindLogo } from '../components/HireMindLogo';
import '../css/register.css';

export type RoleOption =
  | 'ROLE_APP_DEVELOPER'
  | 'ROLE_MANAGEMENT_TEAM'
  | 'ROLE_COMPANY_ADMIN';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // HR & Company fields
  companyName: string;
  jobTitle: string;
  companyWebsite: string;
  industry: string;
  companySize: string;
  // Candidate fields
  phone: string;
  location: string;
  desiredRole: string;
  yearsExperience: string;
  // Developer / Management fields
  specialization: string;
}

const INDUSTRIES = [
  'Technology / Software', 'Finance & Banking', 'Healthcare & Life Sciences',
  'E-Commerce / Retail', 'Education', 'Consulting', 'Manufacturing',
  'Media & Entertainment', 'Government & Public Sector', 'Startup / Venture'
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const ROLE_DEFINITIONS: { id: RoleOption; label: string; tag: string; icon: any; desc: string }[] = [
  {
    id: 'ROLE_APP_DEVELOPER',
    label: 'Application Developer',
    tag: 'Full App Control (Safe DB Mode)',
    icon: Code2,
    desc: 'Full administrative control to manage the HIREMIND-AI platform, AI agents, diagnostics, and code triggers. (Protected from destructive database drop/wipe actions).'
  },
  {
    id: 'ROLE_MANAGEMENT_TEAM',
    label: 'HireMind-Management Team',
    tag: 'Moderation & Temporal Metrics',
    icon: Users2,
    desc: 'Platform governance: manage DB records safely, moderate/block candidates & HRs, blacklist/unblock companies, and inspect Day/Week/Month/Year job posting telemetry.'
  },
  {
    id: 'ROLE_COMPANY_ADMIN',
    label: 'Register Company',
    tag: 'Company Executive / CEO / Director',
    icon: Building2,
    desc: 'Register an enterprise corporate entity with isolated confidential data. Issue verified recruiter badges to HRs and approve/reject candidate verification tags.'
  }
];

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<RoleOption>('ROLE_APP_DEVELOPER');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 4-Digit OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
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
      timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    companyName: '', jobTitle: '', companyWebsite: '', industry: '', companySize: '',
    phone: '', location: '', desiredRole: '', yearsExperience: '', specialization: ''
  });

  const update = (field: keyof FormData, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const currentRoleInfo = ROLE_DEFINITIONS.find(r => r.id === selectedRole) || ROLE_DEFINITIONS[0];

  const handleOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

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

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('All fields are required'); return;
    }
    if (!form.email || !form.email.includes('@') || !form.email.includes('.')) {
      setError('Registration requires a valid email address.'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match'); return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters'); return;
    }
    setStep(2);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/auth/register/send-otp', {
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        role: selectedRole
      });

      setSuccessMsg(`A 4-digit verification code has been dispatched to ${form.email}`);
      setResendCountdown(60);
      setStep(3);
      setTimeout(() => otpRefs[0].current?.focus(), 200);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/register/send-otp', {
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        role: selectedRole
      });
      setSuccessMsg(`New 4-digit code dispatched to ${form.email}`);
      setResendCountdown(60);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 4) {
      setError('Please enter the complete 4-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: selectedRole,
        otp: otpCode,
        phone: form.phone,
        location: form.location
      };

      if (selectedRole === 'ROLE_COMPANY_ADMIN') {
        payload.companyName = form.companyName;
        payload.jobTitle = form.jobTitle;
        payload.companyWebsite = form.companyWebsite;
        payload.industry = form.industry;
        payload.companySize = form.companySize;
      } else {
        payload.specialization = form.specialization;
      }

      await register(payload);

      if (selectedRole === 'ROLE_APP_DEVELOPER' || selectedRole === 'ROLE_MANAGEMENT_TEAM' || selectedRole === 'ROLE_COMPANY_ADMIN') {
        navigate('/admin-portal');
      } else if (selectedRole === 'ROLE_HR') {
        navigate('/hr-analytics');
      } else {
        navigate('/jobs');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Registration failed. Please verify your OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <MilkyWay3DCanvas interactive={true} showOrbits={true} />

      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <HireMindLogo variant="navbar" size="lg" showTagline={true} />
            </div>
            <h1 className="register-title">Create Your HireMind-AI Account</h1>
            <p className="register-subtitle">
              Already have an account? <Link to="/user-login" className="register-login-link">Sign in here →</Link>
            </p>
          </div>

          {/* Role Dropdown Selector (Active on Steps 1 & 2) */}
          {step !== 3 && (
            <div className="register-role-select-wrap" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Your Professional Role *
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value as RoleOption);
                    setError('');
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '12px',
                    padding: '12px 40px 12px 16px',
                    color: '#F8FAFC',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                  }}
                >
                  {ROLE_DEFINITIONS.map(r => (
                    <option key={r.id} value={r.id} style={{ background: '#0F172A', color: '#FFFFFF' }}>
                      {r.label} ({r.tag})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  color="#38BDF8"
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Dynamic Role Description Banner */}
          {step !== 3 && (
            <div className="register-role-banner hr" style={{ borderLeftColor: '#38BDF8', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: '14px' }}>🛡️</span>
                <strong>{currentRoleInfo.label}</strong>
                <span style={{ fontSize: '11px', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 6px', borderRadius: '999px' }}>
                  {currentRoleInfo.tag}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#CBD5E1', lineHeight: 1.4 }}>
                {currentRoleInfo.desc}
              </p>
            </div>
          )}

          {/* Step Progress */}
          <div className="register-step-progress">
            <div className="register-step-item">
              <div className={`register-step-bubble ${step >= 1 ? 'active' : ''}`}>
                {step > 1 ? <CheckCircle2 size={16} /> : '1'}
              </div>
              <span className="register-step-label">Basics</span>
            </div>
            <div className={`register-step-line ${step >= 2 ? 'active' : ''}`} />
            <div className="register-step-item">
              <div className={`register-step-bubble ${step >= 2 ? 'active' : ''}`}>
                {step > 2 ? <CheckCircle2 size={16} /> : '2'}
              </div>
              <span className="register-step-label">
                {selectedRole === 'ROLE_COMPANY_ADMIN' ? 'Company' : 'Credentials'}
              </span>
            </div>
            <div className={`register-step-line ${step === 3 ? 'active' : ''}`} />
            <div className="register-step-item">
              <div className={`register-step-bubble ${step === 3 ? 'active' : ''}`}>
                <ShieldCheck size={16} />
              </div>
              <span className="register-step-label">Email OTP</span>
            </div>
          </div>

          {error && (
            <div className="register-error-alert">
              ⚠️ {error}
            </div>
          )}

          {/* ── STEP 1: Basic Account Info ── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="register-form">
              <div className="register-form-grid">
                <div className="register-form-group">
                  <label className="register-label">First Name *</label>
                  <input className="register-input" type="text" required placeholder="Abhay"
                    value={form.firstName} onChange={e => update('firstName', e.target.value)} />
                </div>
                <div className="register-form-group">
                  <label className="register-label">Last Name *</label>
                  <input className="register-input" type="text" required placeholder="Gupta"
                    value={form.lastName} onChange={e => update('lastName', e.target.value)} />
                </div>
              </div>

              <div className="register-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="register-label">Email Address *</label>
                  <span style={{ fontSize: '11px', color: '#38BDF8' }}>Official / Work Email</span>
                </div>
                <input className="register-input" type="email" required
                  placeholder="your.email@gmail.com"
                  value={form.email} onChange={e => update('email', e.target.value)} />
              </div>

              <div className="register-form-group">
                <label className="register-label">Password * (min. 8 characters)</label>
                <div className="register-password-wrapper">
                  <input className="register-input" type={showPassword ? 'text' : 'password'} required
                    placeholder="Create a strong password"
                    value={form.password} onChange={e => update('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="register-password-toggle">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="register-form-group">
                <label className="register-label">Confirm Password *</label>
                <input className="register-input" type="password" required placeholder="Confirm your password"
                  value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
              </div>

              <div className="register-actions">
                <button type="submit" className="register-btn-submit hr">
                  Continue to Role Details <ArrowRight size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0 6px', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
                <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
              </div>

              <GoogleAuthButton
                role={(selectedRole === 'ROLE_COMPANY_ADMIN' ? 'ROLE_HR' : 'ROLE_CANDIDATE')}
                label={`Fast Register with Google as ${currentRoleInfo.label}`}
                onError={setError}
              />
            </form>
          )}

          {/* ── STEP 2: Role-specific Details ── */}
          {step === 2 && (
            <form onSubmit={handleSendOtp} className="register-form">
              {selectedRole === 'ROLE_COMPANY_ADMIN' ? (
                <>
                  <div className="register-form-grid">
                    <div className="register-form-group">
                      <label className="register-label">Company Legal Name *</label>
                      <input className="register-input" type="text" required placeholder="e.g. Google / Microsoft / NextGen"
                        value={form.companyName} onChange={e => update('companyName', e.target.value)} />
                    </div>
                    <div className="register-form-group">
                      <label className="register-label">Your Executive Designation *</label>
                      <input className="register-input" type="text" required
                        placeholder="Managing Director / CEO"
                        value={form.jobTitle} onChange={e => update('jobTitle', e.target.value)} />
                    </div>
                  </div>
                  <div className="register-form-group">
                    <label className="register-label">Company Website</label>
                    <input className="register-input" type="url" placeholder="https://company.com"
                      value={form.companyWebsite} onChange={e => update('companyWebsite', e.target.value)} />
                  </div>
                  <div className="register-form-grid">
                    <div className="register-form-group">
                      <label className="register-label">Industry</label>
                      <select className="register-input" value={form.industry} onChange={e => update('industry', e.target.value)}>
                        <option value="">Select Industry...</option>
                        {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
                    </div>
                    <div className="register-form-group">
                      <label className="register-label">Company Size</label>
                      <select className="register-input" value={form.companySize} onChange={e => update('companySize', e.target.value)}>
                        <option value="">Select Size...</option>
                        {COMPANY_SIZES.map(sz => <option key={sz} value={sz}>{sz} employees</option>)}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="register-form-grid">
                    <div className="register-form-group">
                      <label className="register-label">Phone / Emergency Contact</label>
                      <input className="register-input" type="tel" placeholder="+91 98765 43210"
                        value={form.phone} onChange={e => update('phone', e.target.value)} />
                    </div>
                    <div className="register-form-group">
                      <label className="register-label">Base Location / Timezone</label>
                      <input className="register-input" type="text" placeholder="e.g. Remote / IST (UTC+5:30)"
                        value={form.location} onChange={e => update('location', e.target.value)} />
                    </div>
                  </div>
                  <div className="register-form-group">
                    <label className="register-label">Department / Engineering Focus</label>
                    <input className="register-input" type="text"
                      placeholder={selectedRole === 'ROLE_APP_DEVELOPER' ? 'AI Agents, Core Engine, Distributed Systems' : 'Platform Operations, User Governance & Compliance'}
                      value={form.specialization} onChange={e => update('specialization', e.target.value)} />
                  </div>
                </>
              )}

              <div className="register-btn-row">
                <button type="button" onClick={() => setStep(1)} className="register-btn-back">
                  ← Back
                </button>
                <button type="submit" disabled={loading} className="register-btn-submit hr">
                  {loading ? 'Dispatching OTP...' : 'Send Verification OTP →'}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: 4-Digit Email OTP Verification ── */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="register-form">
              <div className="register-otp-section">
                <div className="register-otp-icon-wrap">
                  <ShieldCheck size={28} color="#38BDF8" />
                </div>
                <h3 className="register-otp-heading">Verify Your Email Address</h3>
                <p className="register-otp-desc">
                  We've sent a 4-digit code to <strong>{form.email}</strong>. Please enter the code below to activate your account.
                </p>

                {successMsg && (
                  <div className="register-success-alert">
                    ✅ {successMsg}
                  </div>
                )}

                <div className="register-otp-digits-row" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      className={`register-otp-box ${digit ? 'filled' : ''}`}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                <div className="register-resend-row">
                  {resendCountdown > 0 ? (
                    <span className="register-resend-timer">
                      Resend code in <strong>{resendCountdown}s</strong>
                    </span>
                  ) : (
                    <button type="button" onClick={handleResendOtp} disabled={loading} className="register-resend-btn">
                      <RefreshCw size={13} /> Resend 4-Digit Code
                    </button>
                  )}
                </div>
              </div>

              <div className="register-btn-row" style={{ marginTop: 24 }}>
                <button type="button" onClick={() => setStep(2)} className="register-btn-back">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otpDigits.some(d => !d)}
                  className="register-btn-submit hr"
                >
                  {loading ? 'Creating Account...' : 'Complete Registration & Launch 🚀'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
