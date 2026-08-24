import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { 
  Mail, 
  Phone, 
  Building2, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import '../css/contact.css';

// SVG Icon for LinkedIn
const LinkedinIcon: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const { isUniverse: dark } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    const fullPhone = `${countryCode} ${phoneNumber}`.trim();
    const payload = {
      name,
      phone: fullPhone,
      email,
      message,
    };

    try {
      // Try backend contact endpoint
      await apiClient.post('/contact', payload);
      setStatus('success');
      setFeedbackMsg('Thank you! Your query has been delivered successfully to NextGem-Technology.');
    } catch {
      // Graceful fallback to client-side mailto if backend endpoint is unavailable
      const subject = encodeURIComponent(`Query from ${name} - NextGem-Technology`);
      const body = encodeURIComponent(
        `NextGem-Technology Query Form Submission:\n\n` +
        `• Name: ${name}\n` +
        `• Contact: ${fullPhone}\n` +
        `• Email: ${email}\n\n` +
        `• Message:\n${message}\n\n` +
        `---\nSubmitted via HireMind-AI Platform`
      );
      window.location.href = `mailto:nextgemtechno@gmail.com?subject=${subject}&body=${body}`;
      setStatus('success');
      setFeedbackMsg('Opening your email client to dispatch to nextgemtechno@gmail.com.');
    }

    setTimeout(() => {
      setName('');
      setPhoneNumber('');
      setEmail('');
      setMessage('');
      setStatus('idle');
      setFeedbackMsg('');
    }, 4000);
  };

  return (
    <div className={`contact-container ${dark ? 'dark' : 'light'}`}>
      {/* ── Hero Section ── */}
      <div className="contact-hero no-copy">
        <div className="contact-badge">
          <Sparkles size={15} />
          <span>NextGem-Technology Support</span>
        </div>
        <h1 className="contact-title">Get in Touch with Our Team</h1>
        <p className="contact-subtitle">
          Have questions about HireMind-AI, hiring solutions, or partnership opportunities? Reach out to NextGem-Technology.
        </p>
      </div>

      {/* ── Main 2-Column Grid ── */}
      <div className="contact-grid">
        {/* Left Column: Direct Info Cards */}
        <div className="contact-info-panel no-copy">
          {/* Company Card */}
          <div className="contact-card">
            <div className="contact-card-header">
              <div className="contact-icon-wrapper">
                <Building2 size={22} />
              </div>
              <div>
                <h3>Company</h3>
                <p>NextGem-Technology</p>
              </div>
            </div>
            <p>
              Pioneering intelligent AI agents & modern recruitment technology for modern talent acquisition.
            </p>
          </div>

          {/* Official Email Card */}
          <div className="contact-card">
            <div className="contact-card-header">
              <div className="contact-icon-wrapper">
                <Mail size={22} />
              </div>
              <div>
                <h3>Official Email</h3>
                <a href="mailto:nextgemtechno@gmail.com">nextgemtechno@gmail.com</a>
              </div>
            </div>
            <p>Our executive & support team typically replies within 24 hours.</p>
          </div>

          {/* Customer Support Phone Card */}
          <div className="contact-card">
            <div className="contact-card-header">
              <div className="contact-icon-wrapper">
                <Phone size={22} />
              </div>
              <div>
                <h3>Customer Support</h3>
                <a href="tel:+919876543210">+91 98765 43210</a>
              </div>
            </div>
            <p>Available Mon - Fri, 9:00 AM – 6:00 PM IST for urgent inquiries.</p>
          </div>

          {/* LinkedIn & Social Card */}
          <div className="contact-card">
            <div className="contact-card-header">
              <div className="contact-icon-wrapper">
                <LinkedinIcon size={22} color="#8B5CF6" />
              </div>
              <div>
                <h3>LinkedIn Network</h3>
                <a 
                  href="https://www.linkedin.com/company/139843904/admin/dashboard/" 
                  target="_blank" 
                  rel="noreferrer"
                >
                  linkedin.com/company/NextGemTechnology
                </a>
              </div>
            </div>
            <p>Connect with our leadership team, get product announcements, and follow open updates.</p>
          </div>
        </div>

        {/* Right Column: Query Form */}
        <div className="contact-form-panel">
          <div className="no-copy">
            <h2>Send Us a Query</h2>
            <p className="form-desc">
              Fill out the form below. Messages are routed directly to <strong className="highlight-purple">nextgemtechno@gmail.com</strong>.
            </p>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">
                <Sparkles size={14} className="icon-purple" /> Full Name *
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={14} className="icon-cyan" /> Contact Number *
              </label>
              <div className="phone-input-wrapper">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country Code"
                >
                  <option value="+91">🇮🇳 +91 (IN)</option>
                  <option value="+1">🇺🇸 +1 (US)</option>
                  <option value="+44">🇬🇧 +44 (UK)</option>
                  <option value="+61">🇦🇺 +61 (AU)</option>
                  <option value="+49">🇩🇪 +49 (DE)</option>
                  <option value="+81">🇯🇵 +81 (JP)</option>
                  <option value="+65">🇸🇬 +65 (SG)</option>
                  <option value="+971">🇦🇪 +971 (UAE)</option>
                  <option value="+1">🇨🇦 +1 (CA)</option>
                </select>
                <input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={14} className="icon-purple" /> Email / Gmail ID *
              </label>
              <input
                id="email"
                type="email"
                placeholder="alex@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">
                <MessageSquare size={14} className="icon-emerald" /> Message / Query *
              </label>
              <textarea
                id="message"
                placeholder="Tell us how we can help you..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="contact-submit-btn"
              disabled={status === 'sending'}
            >
              <Send size={18} />
              {status === 'sending' ? 'Sending to NextGem-Technology…' : 'Submit Query'}
            </button>

            {status === 'success' && (
              <div className="form-alert success">
                <CheckCircle2 size={18} />
                <span>{feedbackMsg || 'Message sent! Thank you.'}</span>
              </div>
            )}

            {status === 'error' && (
              <div className="form-alert error">
                <AlertCircle size={18} />
                <span>Failed to submit. Please try again or email us directly at nextgemtechno@gmail.com.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
