import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { User, Building2, CheckCircle2, ArrowRight, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import MilkyWay3DCanvas from '../components/MilkyWay3DCanvas';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { HireMindLogo } from '../components/HireMindLogo';
import '../css/register.css';

type RegisterMode = 'CANDIDATE' | 'HR';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // HR-specific fields
  companyName: string;
  jobTitle: string;
  companyWebsite: string;
  industry: string;
  companySize: string;
  // Candidate-specific fields
  phone: string;
  location: string;
  desiredRole: string;
  yearsExperience: string;
}

const INDUSTRIES = [
  'Technology / Software', 'Finance & Banking', 'Healthcare & Life Sciences',
  'E-Commerce / Retail', 'Education', 'Consulting', 'Manufacturing',
  'Media & Entertainment', 'Government & Public Sector', 'Startup / Venture'
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<RegisterMode>('CANDIDATE');
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
    phone: '', location: '', desiredRole: '', yearsExperience: ''
  });

  const update = (field: keyof FormData, value: string) => setForm(prev => ({ ...prev, [field]: value }));

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
        role: mode === 'CANDIDATE' ? 'ROLE_CANDIDATE' : 'ROLE_HR'
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
        role: mode === 'CANDIDATE' ? 'ROLE_CANDIDATE' : 'ROLE_HR'
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
      if (mode === 'CANDIDATE') {
        await register({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: 'ROLE_CANDIDATE',
          phone: form.phone,
          location: form.location,
          desiredRole: form.desiredRole,
          yearsExperience: Number(form.yearsExperience) || 0,
          otp: otpCode
        });
      } else {
        await register({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: 'ROLE_HR',
          companyName: form.companyName,
          jobTitle: form.jobTitle,
          companyWebsite: form.companyWebsite,
          industry: form.industry,
          companySize: form.companySize,
          otp: otpCode
        });
      }
      if (mode === 'HR') {
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
      {/* ── 3D Milky Way Galaxy & Planetary Orbit Canvas ── */}
      <MilkyWay3DCanvas interactive={true} showOrbits={true} />

      {/* ── Floating 3D Celestial Glassmorphism Register Card ── */}
      <div className="register-container">
        <div className="register-card">
          {/* Header */}
          <div className="register-header">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <HireMindLogo variant="navbar" size="lg" showTagline={true} />
            </div>
            <h1 className="register-title">Create Your HireMind-AI Account</h1>
            <p className="register-subtitle">
              Already have an account? <Link to="/login" className="register-login-link">Sign in here →</Link>
            </p>
          </div>

          {/* Mode Toggle (only allowed in step 1 & 2) */}
          {step !== 3 && (
            <div className="register-mode-toggle">
              <button
                onClick={() => { setMode('CANDIDATE'); setStep(1); setError(''); }}
                className={`register-mode-btn ${mode === 'CANDIDATE' ? 'active-candidate' : ''}`}
              >
                <User size={18} /> I'm a Candidate
              </button>
              <button
                onClick={() => { setMode('HR'); setStep(1); setError(''); }}
                className={`register-mode-btn ${mode === 'HR' ? 'active-hr' : ''}`}
              >
                <Building2 size={18} /> I'm an HR Recruiter
              </button>
            </div>
          )}

          {/* Role description banner */}
          {step !== 3 && (
            <div className={`register-role-banner ${mode.toLowerCase()}`}>
              {mode === 'CANDIDATE' ? (
                <>🎯 <strong>Candidate Account</strong> — Upload your resume for AI analysis, browse AI-matched job recommendations, track applications, and build your portfolio showcase.</>
              ) : (
                <>🏢 <strong>HR Recruiter Account</strong> — Post jobs, screen candidates with AI match scoring, use the AI Copilot for interviews, and access hiring funnel analytics.</>
              )}
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
                {mode === 'CANDIDATE' ? 'Career' : 'Company'}
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
                  <input className="register-input" type="text" required placeholder="John"
                    value={form.firstName} onChange={e => update('firstName', e.target.value)} />
                </div>
                <div className="register-form-group">
                  <label className="register-label">Last Name *</label>
                  <input className="register-input" type="text" required placeholder="Doe"
                    value={form.lastName} onChange={e => update('lastName', e.target.value)} />
                </div>
              </div>

              <div className="register-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="register-label">Email Address *</label>
                  <span style={{ fontSize: '11px', color: '#38BDF8' }}>Must end with @gmail.com</span>
                </div>
                <input className="register-input" type="email" required
                  placeholder={mode === 'HR' ? 'recruiter.hr@gmail.com' : 'candidate.alex@gmail.com'}
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
                <button type="submit" className={`register-btn-submit ${mode.toLowerCase()}`}>
                  Continue to {mode === 'CANDIDATE' ? 'Career Details' : 'Company Details'} <ArrowRight size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0 6px', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
                <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
              </div>

              <GoogleAuthButton
                role={mode === 'HR' ? 'ROLE_HR' : 'ROLE_CANDIDATE'}
                label={`Fast Register with Google as ${mode === 'HR' ? 'HR Recruiter' : 'Candidate'}`}
                onError={setError}
              />
            </form>
          )}

          {/* ── STEP 2: Role-specific Details ── */}
          {step === 2 && (
            <form onSubmit={handleSendOtp} className="register-form">
              {mode === 'CANDIDATE' ? (
                // ── CANDIDATE STEP 2 ──
                <>
                  <div className="register-form-grid">
                    <div className="register-form-group">
                      <label className="register-label">Phone Number</label>
                      <input className="register-input" type="tel" placeholder="+91 98765 43210"
                        value={form.phone} onChange={e => update('phone', e.target.value)} />
                    </div>
                    <div className="register-form-group">
                      <label className="register-label">Current Location</label>
                      <input className="register-input" type="text" placeholder="Mumbai, India"
                        value={form.location} onChange={e => update('location', e.target.value)} />
                    </div>
                  </div>

                  <div className="register-form-group">
                    <label className="register-label">Desired Job Role / Title</label>
                    <input className="register-input" type="text" placeholder="e.g. Senior Java Engineer, Full-Stack Developer"
                      value={form.desiredRole} onChange={e => update('desiredRole', e.target.value)} />
                  </div>

                  <div className="register-form-group">
                    <label className="register-label">Years of Professional Experience</label>
                    <select className="register-select" value={form.yearsExperience} onChange={e => update('yearsExperience', e.target.value)}>
                      <option value="">Select experience level</option>
                      <option value="0">Fresher / Intern (0 years)</option>
                      <option value="1">1 year</option>
                      <option value="2">2 years</option>
                      <option value="3">3 years</option>
                      <option value="4">4 years</option>
                      <option value="5">5 years</option>
                      <option value="7">7 years</option>
                      <option value="10">10 years</option>
                      <option value="15">15+ years</option>
                    </select>
                  </div>
                </>
              ) : (
                // ── HR RECRUITER STEP 2 ──
                <>
                  <div className="register-form-grid">
                    <div className="register-form-group">
                      <label className="register-label">Company Name *</label>
                      <input className="register-input" type="text" required placeholder="e.g. TechCorp Solutions Pvt. Ltd."
                        value={form.companyName} onChange={e => update('companyName', e.target.value)} />
                    </div>
                    <div className="register-form-group">
                      <label className="register-label">Your Job Title *</label>
                      <input className="register-input" type="text" required placeholder="e.g. Senior Technical Recruiter"
                        value={form.jobTitle} onChange={e => update('jobTitle', e.target.value)} />
                    </div>
                  </div>

                  <div className="register-form-group">
                    <label className="register-label">Company Website</label>
                    <input className="register-input" type="url" placeholder="https://yourcompany.com"
                      value={form.companyWebsite} onChange={e => update('companyWebsite', e.target.value)} />
                  </div>

                  <div className="register-form-grid">
                    <div className="register-form-group">
                      <label className="register-label">Industry *</label>
                      <select className="register-select" required value={form.industry} onChange={e => update('industry', e.target.value)}>
                        <option value="">Select Industry</option>
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div className="register-form-group">
                      <label className="register-label">Company Size *</label>
                      <select className="register-select" required value={form.companySize} onChange={e => update('companySize', e.target.value)}>
                        <option value="">Select Size</option>
                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="register-actions">
                <button type="button" onClick={() => setStep(1)} className="register-btn-back">
                  ← Back
                </button>
                <button
                  type="submit"
                  className={`register-btn-submit ${mode.toLowerCase()}`}
                  disabled={loading}
                >
                  {loading ? 'Sending Code...' : `Verify Email & Continue →`}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Mandatory Email Verification OTP ── */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="register-form">
              {successMsg && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38BDF8',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  marginBottom: '16px'
                }}>
                  ✨ {successMsg}
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ color: '#94A3B8', fontSize: '14px', margin: '0 0 16px' }}>
                  Please enter the 4-digit numeric verification code sent to <br />
                  <strong style={{ color: '#F8FAFC', fontSize: '15px' }}>{form.email}</strong>
                </p>

                {/* 4-Digit Inputs */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', margin: '20px 0' }}>
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
                      onPaste={handleOtpPaste}
                      style={{
                        width: '56px',
                        height: '64px',
                        fontSize: '28px',
                        fontWeight: '800',
                        textAlign: 'center',
                        borderRadius: '12px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: digit ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#F8FAFC',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: digit ? '0 0 16px rgba(56, 189, 248, 0.35)' : 'none'
                      }}
                    />
                  ))}
                </div>

                <div style={{ margin: '14px 0 6px', fontSize: '13px', color: '#94A3B8' }}>
                  {resendCountdown > 0 ? (
                    <span>⏱️ Resend code in <strong style={{ color: '#38BDF8' }}>{resendCountdown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38BDF8',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <RefreshCw size={14} /> Resend 4-digit code
                    </button>
                  )}
                </div>
              </div>

              <div className="register-actions">
                <button type="button" onClick={() => setStep(2)} className="register-btn-back">
                  ← Back
                </button>
                <button
                  type="submit"
                  className={`register-btn-submit ${mode.toLowerCase()}`}
                  disabled={loading || otpDigits.join('').length !== 4}
                >
                  {loading ? 'Activating Account...' : `Verify & Create ${mode === 'CANDIDATE' ? 'Candidate' : 'HR'} Account 🚀`}
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
