import React from 'react';
import aiLogoSrc from '../assets/ai-logo.png';
import '../css/ai-logo.css';

interface AiLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const AiLogo: React.FC<AiLogoProps> = ({
  size = 24,
  animated = false,
  className = '',
  style = {},
  title = 'HireMind AI'
}) => {
  return (
    <span
      className={`ai-logo-wrapper ${animated ? 'animated' : ''} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        ...style
      }}
      title={title}
      role="img"
      aria-label={title}
    >
      {animated && (
        <>
          <span className="ai-logo-wheel-ring" />
          <span className="ai-logo-glow-disc" />
        </>
      )}
      <img
        src={aiLogoSrc}
        alt={title}
        className="ai-logo-image"
        style={{
          width: `${size}px`,
          height: `${size}px`
        }}
        loading="eager"
      />
    </span>
  );
};

export default AiLogo;
