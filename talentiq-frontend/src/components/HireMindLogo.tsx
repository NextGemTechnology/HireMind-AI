import React from 'react';
import '../css/hiremind-logo.css';

interface HireMindLogoProps {
  variant?: 'full' | 'navbar' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const HireMindLogo: React.FC<HireMindLogoProps> = ({
  variant = 'navbar',
  size = 'md',
  showTagline = false,
  className = '',
  onClick
}) => {
  if (variant === 'icon') {
    return (
      <div
        className={`hiremind-logo-wrap icon-mode size-${size} ${className}`}
        onClick={onClick}
        title="HireMind-AI (NextGem Technology)"
      >
        <div className="hiremind-icon-container">
          <img
            src="/assets/hiremind-logo.jpg"
            alt="HireMind-AI Emblem"
            className="hiremind-emblem-img"
          />
          <div className="hiremind-shine-beam" />
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div
        className={`hiremind-logo-wrap full-mode size-${size} ${className}`}
        onClick={onClick}
        title="HireMind-AI (NextGem Technology)"
      >
        <div className="hiremind-full-card">
          <div className="hiremind-image-shine-frame">
            <img
              src="/assets/hiremind-logo.jpg"
              alt="HireMind-AI by NextGem Technology"
              className="hiremind-full-img"
            />
            <div className="hiremind-shine-beam" />
          </div>
        </div>
      </div>
    );
  }

  // Default: 'navbar' or 'badge'
  return (
    <div
      className={`hiremind-logo-wrap navbar-mode size-${size} ${className}`}
      onClick={onClick}
      title="HireMind-AI (NextGem Technology)"
    >
      <div className="hiremind-nav-emblem">
        <img
          src="/assets/hiremind-logo.jpg"
          alt="HireMind-AI"
          className="hiremind-nav-img"
        />
        <div className="hiremind-shine-beam" />
      </div>

      <div className="hiremind-text-lockup">
        <div className="hiremind-brand-line">
          <span className="brand-hire">Hire</span>
          <span className="brand-mind">Mind</span>
          <span className="brand-dash">-</span>
          <div className="brand-ai-ngt-box">
            <span className="brand-ngt-tag">NGT</span>
            <span className="brand-ai">AI</span>
          </div>
        </div>
        {(showTagline || variant === 'badge') && (
          <span className="brand-tagline">SMARTER HIRING • NEXTGEM</span>
        )}
      </div>
    </div>
  );
};

export default HireMindLogo;
