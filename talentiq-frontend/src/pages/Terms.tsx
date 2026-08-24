import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import '../css/legal.css';

export const Terms: React.FC = () => {
  return (
    <div className="legal-container">
      <div className="legal-content-wrapper no-copy">
        <Link to="/" className="legal-back-link">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <div className="legal-card">
          <div className="legal-header">
            <div className="legal-icon-box purple">
              <FileText size={24} />
            </div>
            <div>
              <h1>Terms &amp; Conditions</h1>
              <p>NextGem-Technology Platform Terms of Service</p>
            </div>
          </div>

          <div className="legal-sections">
            <section className="legal-section">
              <h3>1. Acceptance of Terms</h3>
              <p>
                By accessing and utilizing HireMind-AI and related services engineered by NextGem-Technology, you agree to comply with and be bound by these Terms of Service.
              </p>
            </section>

            <section className="legal-section">
              <h3>2. Proprietary Rights &amp; Copy Protection</h3>
              <p>
                All software algorithms, user interface components, cosmic matching heuristics, and design architectures are the exclusive intellectual property of NextGem-Technology. Unauthorized scraping, copying, reverse-engineering, or reproduction of any elements is strictly forbidden.
              </p>
            </section>

            <section className="legal-section">
              <h3>3. User Conduct &amp; Verification</h3>
              <p>
                Candidates and HR recruiters must provide accurate and verifiable credentials. Registration requires email OTP verification to maintain platform integrity.
              </p>
            </section>

            <section className="legal-section">
              <h3>4. Contact &amp; Legal Inquiries</h3>
              <p>
                For official correspondence, contact NextGem-Technology at <a href="mailto:nextgemtechno@gmail.com">nextgemtechno@gmail.com</a>.
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

export default Terms;
