import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles,
  Brain,
  Zap,
  Mail,
  Sun,
  Moon,
  Lock,
  ArrowRight
} from 'lucide-react';
import '../css/about.css';

// Clean SVG Icons for GitHub & LinkedIn
const GithubIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const About: React.FC = () => {
  const { isUniverse: dark, toggleTheme } = useTheme();

  return (
    <div className={`about-container ${dark ? 'dark' : 'light'}`}>
      {/* ── Hero Section ── */}
      <div className="about-hero no-copy">
        <div className="about-badge">
          <Sparkles size={15} />
          <span>About NextGem-Technology</span>
        </div>
        <h1 className="about-title">Next-Gen Intelligent Recruitment</h1>
        <p className="about-subtitle">
          NextGem-Technology designs high-performance autonomous recruitment software, bridging ambitious talent with high-impact engineering and innovation teams across the globe.
        </p>
      </div>

      <div className="about-content-wrapper">
        {/* ── Main Organization Card ── */}
        <div className="about-card-main no-copy">
          <div className="about-logo-box">
            <span>NT</span>
          </div>
          <div className="about-company-info">
            <h2>NextGem-Technology</h2>
            <p>
              Founded to eliminate friction in modern hiring, NextGem-Technology creates proprietary AI agents, semantic candidate scoring, and cosmic analytics engines. HireMind-AI is our flagship platform designed for candidates seeking high-growth careers and HR teams seeking exceptional talent.
            </p>
            <div className="about-actions-row">
              <a
                href="https://github.com/NextGemTechnology"
                target="_blank"
                rel="noreferrer"
                className="channel-btn purple-tint"
              >
                <GithubIcon size={18} color="#8B5CF6" />
                <span>GitHub Profile</span>
              </a>
              <a
                href="https://www.linkedin.com/company/139843904/admin/dashboard/"
                target="_blank"
                rel="noreferrer"
                className="channel-btn cyan-tint"
              >
                <LinkedinIcon size={18} color="#06B6D4" />
                <span>LinkedIn Company</span>
              </a>
            </div>
          </div>
        </div>

        {/* ── Platform Architecture & Pillars ── */}
        <div className="about-pillars no-copy">
          <div className="pillar-card">
            <div className="pillar-icon">
              <Brain size={24} />
            </div>
            <h3>Autonomous AI Copilots</h3>
            <p>
              Smart recommendation engines and conversational AI assistants guide job seekers through resume scoring, match insights, and interview preparation.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon">
              <Zap size={24} />
            </div>
            <h3>Real-Time Microservices</h3>
            <p>
              Built upon a resilient microservice backend, Redis real-time sync, and event-driven architecture delivering sub-second response times.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon">
              <Lock size={24} />
            </div>
            <h3>Enterprise Privacy & Security</h3>
            <p>
              End-to-end data encryption, verified OTP email security, role-based access control, and strict copy & IP protections.
            </p>
          </div>
        </div>

        {/* ── Official Channels & Action Links ── */}
        <div className="about-links-section no-copy">
          <h3>Connect with NextGem-Technology</h3>
          <div className="channels-grid">
            <a
              href="mailto:nextgemtechno@gmail.com"
              className="channel-btn"
            >
              <Mail size={18} color="#F43F5E" />
              <span>nextgemtechno@gmail.com</span>
            </a>

            <a
              href="https://github.com/NextGemTechnology"
              target="_blank"
              rel="noreferrer"
              className="channel-btn"
            >
              <GithubIcon size={18} color="#8B5CF6" />
              <span>github.com/NextGemTechnology</span>
            </a>

            <a
              href="https://www.linkedin.com/company/139843904/admin/dashboard/"
              target="_blank"
              rel="noreferrer"
              className="channel-btn"
            >
              <LinkedinIcon size={18} color="#06B6D4" />
              <span>LinkedIn Organization</span>
            </a>
          </div>

          {/* Theme Toggle Button */}
          <div className="about-theme-bar">
            <button
              onClick={toggleTheme}
              className="about-theme-toggle"
              aria-label="Toggle Theme Mode"
            >
              {dark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#8B5CF6" />}
              <span>Switch to {dark ? 'Light Mode' : 'Universe Mode'}</span>
            </button>

            <Link
              to="/contact"
              className="channel-btn brand-cta"
            >
              <span>Contact Us</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* ── Footer / Copyright ── */}
        <div className="about-footer no-copy">
          <div className="legal-links">
            <Link to="/terms">Terms &amp; Conditions</Link>
            <span>•</span>
            <Link to="/privacy">Privacy Policy</Link>
            <span>•</span>
            <Link to="/contact">Support</Link>
          </div>
          <p>
            &copy; {new Date().getFullYear()} NextGem-Technology. All rights reserved. Unauthorized reproduction or copying is strictly prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
