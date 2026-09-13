import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { HireMindLogo } from './HireMindLogo';
import '../css/footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="global-app-footer">
      <div className="footer-container footer-inner">
        {/* Brand Column */}
        <div className="footer-brand-col">
          <Link to="/" className="footer-brand-link" aria-label="HireMind Home">
            <HireMindLogo variant="navbar" size="sm" />
          </Link>
          <p className="footer-brand-desc">
            Next-gen recruitment intelligence platform connecting elite talent with verified companies worldwide.
          </p>
        </div>

        {/* Platform Column */}
        <div className="footer-links-col">
          <h4 className="footer-col-title">Platform</h4>
          <Link to="/jobs" className="footer-link">Find Jobs</Link>
          <Link to="/hr-login" className="footer-link">For Employers</Link>
          <Link to="/user-login" className="footer-link">Candidate Portal</Link>
        </div>

        {/* Company Column */}
        <div className="footer-links-col">
          <h4 className="footer-col-title">Company</h4>
          <Link to="/about" className="footer-link">About Us</Link>
          <Link to="/contact" className="footer-link">Contact Support</Link>
          <a href="https://github.com/NextGemTechnology" target="_blank" rel="noreferrer" className="footer-link">
            GitHub <ArrowUpRight size={12} className="footer-external-icon" />
          </a>
          <a href="https://www.linkedin.com/company/139843904/admin/dashboard/" target="_blank" rel="noreferrer" className="footer-link">
            LinkedIn <ArrowUpRight size={12} className="footer-external-icon" />
          </a>
        </div>

        {/* Legal Column */}
        <div className="footer-links-col">
          <h4 className="footer-col-title">Legal & Trust</h4>
          <Link to="/terms" className="footer-link">Terms & Conditions</Link>
          <Link to="/privacy" className="footer-link">Privacy Policy</Link>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-container footer-bottom">
        <span className="footer-support-email">
          Direct Support: <a href="mailto:nextgemtechno@gmail.com">nextgemtechno@gmail.com</a>
        </span>
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()}{' '}
          <a href="https://github.com/NextGemTechnology" target="_blank" rel="noreferrer">NextGem-Technology</a>.
          All rights reserved. Built by{' '}
          <a href="https://github.com/AbhayGupta002" target="_blank" rel="noreferrer">Abhay Gupta</a>.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
