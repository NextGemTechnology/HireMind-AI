import React from 'react';
import { HireMindAiLogo } from './HireMindAiLogo';
import '../css/hiremind-logo.css';

export interface HireMindLogoProps {
  variant?: 'full' | 'navbar' | 'icon' | 'badge' | 'emblem';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'auto';
  theme?: 'dark' | 'light' | 'auto';
  showTagline?: boolean;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

export const HireMindLogo: React.FC<HireMindLogoProps> = ({
  variant = 'navbar',
  size = 'md',
  theme = 'auto',
  showTagline = false,
  animated = true,
  className = '',
  onClick
}) => {
  // Map variant to HireMindAiLogo variant
  const aiVariant =
    variant === 'icon' || variant === 'badge' || variant === 'emblem'
      ? 'emblem'
      : variant === 'full'
      ? 'full'
      : 'navbar';

  return (
    <HireMindAiLogo
      variant={aiVariant}
      size={size}
      theme={theme}
      animated={animated}
      showTagline={showTagline}
      className={`hiremind-app-logo ${className}`}
      onClick={onClick}
    />
  );
};

export default HireMindLogo;
