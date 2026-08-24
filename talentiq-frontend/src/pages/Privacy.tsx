import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import '../css/legal.css';

export const Privacy: React.FC = () => {
  return (
    <div className="legal-container">
      <div className="legal-content-wrapper no-copy">
        <Link to="/" className="legal-back-link">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <div className="legal-card">
          <div className="legal-header">
            <div className="legal-icon-box cyan">
              <Lock size={24} />
            </div>
            <div>
              <h1>Privacy Policy</h1>
              <p>NextGem-Technology Data Protection &amp; Privacy</p>
            </div>
          </div>

          <div className="legal-sections">
            <section className="legal-section">
              <h3>1. Data Collection &amp; Purpose</h3>
              <p>
                NextGem-Technology collects candidate and recruiter information solely for AI job matching, application tracking, and profile presentation. We do not sell or lease personal identification data.
              </p>
            </section>

            <section className="legal-section">
              <h3>2. Security &amp; Encryption</h3>
              <p>
                Passwords are protected using cryptographic hashing (BCrypt), sessions are secured via JWT tokens, and multi-factor email verification ensures authorized account creation and access.
              </p>
            </section>

            <section className="legal-section">
              <h3>3. Queries &amp; Data Rights</h3>
              <p>
                Users may request data deletion or account closure at any time by contacting our privacy compliance officer at <a href="mailto:nextgemtechno@gmail.com">nextgemtechno@gmail.com</a>.
              </p>
            </section>
          </div>

          <div className="legal-footer">
            &copy; {new Date().getFullYear()} NextGem-Technology. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
