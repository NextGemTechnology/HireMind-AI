import React from 'react';
import { useTheme } from '../context/ThemeContext';
import '../css/hiremind-ai-logo.css';

export interface HireMindAiLogoProps {
  variant?: 'full' | 'emblem' | 'horizontal' | 'navbar';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'auto' | number;
  theme?: 'dark' | 'light' | 'auto';
  animated?: boolean;
  showTagline?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const HireMindAiLogo: React.FC<HireMindAiLogoProps> = ({
  variant = 'full',
  size = 'md',
  theme = 'auto',
  animated = true,
  showTagline = true,
  className = '',
  style = {},
  onClick
}) => {
  const themeCtx = useTheme?.();
  const isDark =
    theme === 'dark' ? true : theme === 'light' ? false : (themeCtx?.isUniverse ?? true);

  const uniqueId = React.useId().replace(/:/g, '_');

  // Dimension presets
  const sizeClass = typeof size === 'string' ? `hm-size-${size}` : '';
  const customHeight = typeof size === 'number' ? size : undefined;

  // Render Emblem Vector Component
  const renderEmblem = (idPrefix: string) => (
    <g className="hm-emblem-group">
      {/* ── Soft Ambient Ground Shadow ── */}
      <ellipse
        cx="400"
        cy="338"
        rx="180"
        ry="18"
        fill={`url(#${idPrefix}-groundShadow)`}
        opacity="0.6"
      />

      {/* ── Outer Orbital Glow Ring ── */}
      <ellipse
        cx="400"
        cy="185"
        rx="170"
        ry="170"
        fill="none"
        stroke={`url(#${idPrefix}-orbitGrad)`}
        strokeWidth="2.5"
        className="hm-orbital-ring"
      />

      {/* ── Sparkle 1 (Upper Left Orbit) ── */}
      <g className="hm-sparkle-star hm-sparkle-star-1">
        <path
          d="M 260 98 Q 260 115, 243 115 Q 260 115, 260 132 Q 260 115, 277 115 Q 260 115, 260 98 Z"
          fill={`url(#${idPrefix}-sparklePurple)`}
          filter={`url(#${idPrefix}-sparkleGlow)`}
        />
        <circle cx="260" cy="115" r="2.5" fill="#FFFFFF" />
      </g>

      {/* ── Sparkle 2 (Lower Right Orbit) ── */}
      <g className="hm-sparkle-star hm-sparkle-star-2">
        <path
          d="M 555 220 Q 555 235, 540 235 Q 555 235, 555 250 Q 555 235, 570 235 Q 555 235, 555 220 Z"
          fill={`url(#${idPrefix}-sparkleCyan)`}
          filter={`url(#${idPrefix}-sparkleGlow)`}
        />
        <circle cx="555" cy="235" r="2.5" fill="#FFFFFF" />
      </g>

      {/* ── Left Pillar Base & 3D Shading ── */}
      <g filter={`url(#${idPrefix}-dropShadow)`}>
        {/* Left Pillar Body */}
        <path
          d="M 285 105 C 285 85, 310 75, 335 78 C 348 80, 355 90, 355 105 L 355 210 C 335 215, 320 230, 320 250 L 320 300 C 320 310, 310 318, 298 318 C 288 318, 285 310, 285 298 Z"
          fill={`url(#${idPrefix}-leftPillarGrad)`}
        />

        {/* Left Pillar 3D Bevel Facet */}
        <path
          d="M 285 105 L 285 298 C 285 310, 290 318, 300 318 L 320 300 L 320 250 C 320 230, 335 215, 355 210 L 355 105 C 355 90, 348 80, 335 78 Z"
          fill={`url(#${idPrefix}-leftPillarBevel)`}
          opacity="0.85"
        />

        {/* Left Pillar Top Highlight */}
        <path
          d="M 285 105 C 285 85, 310 75, 335 78 C 348 80, 355 90, 355 105 C 345 95, 330 92, 315 95 C 295 99, 287 105, 285 105 Z"
          fill={`url(#${idPrefix}-specularHighlight)`}
        />
      </g>

      {/* ── Right Pillar: AI Head Silhouette with Neural Circuit Board ── */}
      <g filter={`url(#${idPrefix}-dropShadow)`}>
        {/* Profile of Head & Right Pillar Base */}
        <path
          d="M 420 85 C 420 62, 455 50, 495 54 C 522 58, 532 76, 536 94 C 539 106, 533 116, 530 122 C 538 126, 547 131, 547 138 C 547 142, 538 147, 534 152 C 539 158, 538 166, 532 170 C 536 176, 538 182, 534 188 C 526 198, 510 204, 502 214 L 498 300 C 498 310, 488 318, 476 318 L 434 318 C 424 318, 418 310, 418 300 Z"
          fill={`url(#${idPrefix}-headProfileGrad)`}
        />

        {/* Head Surface Sheen */}
        <path
          d="M 420 85 C 420 62, 455 50, 495 54 C 522 58, 532 76, 536 94 C 520 80, 490 74, 450 82 C 430 86, 422 92, 420 85 Z"
          fill={`url(#${idPrefix}-specularHighlight)`}
          opacity="0.6"
        />

        {/* Neural Circuit Board Traces */}
        <g className="hm-neural-circuits" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
          <path d="M 430 150 L 430 105 L 445 95 L 475 80" className="hm-circuit-trace" />
          <path d="M 445 95 L 470 120 L 465 125" className="hm-circuit-trace" />
          <path d="M 470 120 L 498 100" className="hm-circuit-trace" />
          <path d="M 440 170 L 460 170 L 472 165" className="hm-circuit-trace" />
          <path d="M 460 170 L 475 145 L 490 135" className="hm-circuit-trace" />
          <path d="M 472 165 L 508 165" className="hm-circuit-trace" />
        </g>

        {/* Neural Nodes (Glowing Round Solder Pads) */}
        <g fill="#FFFFFF">
          <circle cx="475" cy="80" r="4.5" className="hm-circuit-node" />
          <circle cx="498" cy="100" r="4.5" className="hm-circuit-node" />
          <circle cx="465" cy="125" r="4" className="hm-circuit-node" />
          <circle cx="490" cy="135" r="4.5" className="hm-circuit-node" />
          <circle cx="508" cy="165" r="4" className="hm-circuit-node" />
          <circle cx="445" cy="95" r="3.5" className="hm-circuit-node" />
        </g>
      </g>

      {/* ── 3D Sweeping Wave Ribbon (Crossbar of "H") ── */}
      <g filter={`url(#${idPrefix}-dropShadow)`} className="hm-ribbon-wave">
        {/* Ribbon Underfold Shadow */}
        <path
          d="M 292 208 C 308 226, 335 240, 360 220 C 378 205, 395 180, 420 160 C 445 140, 475 145, 482 170 L 482 188 C 468 168, 442 160, 418 178 C 392 198, 368 225, 345 235 C 322 245, 298 232, 292 208 Z"
          fill={`url(#${idPrefix}-ribbonUnderFold)`}
        />

        {/* Ribbon Upper Vibrant Swell */}
        <path
          d="M 292 208 C 302 215, 320 222, 340 210 C 370 192, 395 155, 435 140 C 468 128, 492 145, 492 182 C 492 198, 482 208, 468 208 C 452 208, 445 198, 445 186 C 445 174, 435 168, 420 174 C 392 186, 368 218, 338 230 C 315 239, 298 228, 292 208 Z"
          fill={`url(#${idPrefix}-ribbonFaceGrad)`}
        />

        {/* Ribbon Specular Highlight Crest Line */}
        <path
          d="M 295 208 C 312 218, 330 216, 350 200 C 380 178, 405 148, 440 138 C 465 130, 485 142, 490 168"
          fill="none"
          stroke={`url(#${idPrefix}-specularHighlight)`}
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>

      {/* ── Resume Document Card & Verification Badge ── */}
      <g filter={`url(#${idPrefix}-cardShadow)`}>
        {/* Card Surface */}
        <rect
          x="438"
          y="196"
          width="76"
          height="98"
          rx="10"
          ry="10"
          fill={`url(#${idPrefix}-cardGrad)`}
          stroke="rgba(56, 189, 248, 0.45)"
          strokeWidth="1.5"
        />

        {/* Card Header Avatar */}
        <circle cx="456" cy="214" r="6" fill="#1E3A8A" />
        <path d="M 448 226 C 448 221, 464 221, 464 226 Z" fill="#1E3A8A" />

        {/* Header Text Skeleton Lines */}
        <rect x="468" y="211" width="34" height="3" rx="1.5" fill="#2563EB" />
        <rect x="468" y="218" width="24" height="3" rx="1.5" fill="#60A5FA" />

        {/* Body Text Skeleton Lines */}
        <rect x="448" y="234" width="46" height="3" rx="1.5" fill="#60A5FA" />
        <rect x="448" y="242" width="36" height="3" rx="1.5" fill="#93C5FD" />
        <rect x="448" y="250" width="28" height="3" rx="1.5" fill="#93C5FD" />
        <rect x="448" y="258" width="40" height="3" rx="1.5" fill="#BFDBFE" />
        <rect x="448" y="266" width="22" height="3" rx="1.5" fill="#DBEAFE" />

        {/* Magnifying Glass with AI Checkmark */}
        <g>
          {/* Glass Handle */}
          <rect
            x="504"
            y="266"
            width="7"
            height="18"
            rx="3.5"
            transform="rotate(-45 504 266)"
            fill="#1E3A8A"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

          {/* Glass Outer Rim */}
          <circle
            cx="492"
            cy="256"
            r="18"
            fill={`url(#${idPrefix}-magLensGrad)`}
            stroke="#FFFFFF"
            strokeWidth="3.5"
            filter={`url(#${idPrefix}-dropShadow)`}
          />

          {/* White Verified Checkmark */}
          <path
            d="M 485 256 L 490 261 L 500 251"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* ── Internal Reflection Sheen Overlay (Masked to Emblem Contours) ── */}
      {animated && (
        <g mask={`url(#${idPrefix}-internalSheenMask)`}>
          <rect
            x="-450"
            y="40"
            width="260"
            height="320"
            fill={`url(#${idPrefix}-internalShineGrad)`}
            className="hm-shine-sweep"
            pointerEvents="none"
          />
        </g>
      )}
    </g>
  );

  // 1. Variant: 'emblem'
  if (variant === 'emblem') {
    return (
      <div
        className={`hm-logo-container ${animated ? 'animated' : ''} ${sizeClass} ${className}`}
        style={{ ...style, height: customHeight }}
        onClick={onClick}
        title="HireMind AI"
      >
        <svg
          viewBox="180 30 440 330"
          className="hm-logo-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          {renderDefs(uniqueId)}
          {renderEmblem(uniqueId)}
        </svg>
      </div>
    );
  }

  // 2. Variant: 'horizontal' / 'navbar'
  if (variant === 'horizontal' || variant === 'navbar') {
    return (
      <div
        className={`hm-logo-container ${animated ? 'animated' : ''} ${sizeClass} ${className}`}
        style={{ ...style, height: customHeight, gap: '10px' }}
        onClick={onClick}
        title="HireMind AI"
      >
        <svg
          viewBox="180 35 700 310"
          className="hm-logo-svg"
          xmlns="http://www.w3.org/2000/svg"
          style={{ height: '100%', width: 'auto', maxHeight: '100%' }}
        >
          {renderDefs(uniqueId)}
          <g transform="scale(0.8) translate(10, 20)">
            {renderEmblem(uniqueId)}
          </g>

          {/* Typography Lockup beside emblem */}
          <g transform="translate(465, 175)">
            <text
              x="0"
              y="0"
              fontSize="68"
              className={`hm-text-hiremind ${isDark ? 'hm-text-light' : 'hm-text-dark'}`}
            >
              HireMind
            </text>
            <text
              x="305"
              y="0"
              fontSize="68"
              fontWeight="900"
              fill={`url(#${uniqueId}-aiTextGrad)`}
              letterSpacing="-0.02em"
            >
              AI
            </text>

            {/* Sparkle Star over 'I' */}
            <g className="hm-sparkle-star hm-sparkle-star-3" transform="translate(378, -48)">
              <path
                d="M 0 -10 Q 0 0, -10 0 Q 0 0, 0 10 Q 0 0, 10 0 Q 0 0, 0 -10 Z"
                fill={`url(#${uniqueId}-sparklePurple)`}
                filter={`url(#${uniqueId}-sparkleGlow)`}
              />
              <circle cx="0" cy="0" r="1.8" fill="#FFFFFF" />
            </g>

            {showTagline && (
              <>
                <text
                  x="2"
                  y="36"
                  className={`hm-text-tagline ${isDark ? 'hm-tagline-light' : 'hm-tagline-dark'}`}
                  fontSize="15"
                >
                  SMARTER HIRING. BETTER TEAMS.
                </text>
                <line x1="2" y1="46" x2="385" y2="46" stroke={`url(#${uniqueId}-taglineRuleGrad)`} strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </g>
        </svg>
      </div>
    );
  }

  // 3. Variant: 'full' (Exact composition of the uploaded image)
  return (
    <div
      className={`hm-logo-container ${animated ? 'animated' : ''} ${sizeClass} ${className}`}
      style={{ ...style, height: customHeight }}
      onClick={onClick}
      title="HireMind AI — Smarter Hiring. Better Teams."
    >
      <svg
        viewBox="80 20 640 480"
        className="hm-logo-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderDefs(uniqueId)}
        {renderEmblem(uniqueId)}

        {/* ── Wordmark Typography: "HireMind AI" ── */}
        <g transform="translate(400, 405)" textAnchor="middle">
          <text
            x="-42"
            y="0"
            fontSize="76"
            className={`hm-text-hiremind ${isDark ? 'hm-text-light' : 'hm-text-dark'}`}
            textAnchor="end"
          >
            HireMind
          </text>
          <text
            x="-28"
            y="0"
            fontSize="76"
            fontWeight="900"
            fill={`url(#${uniqueId}-aiTextGrad)`}
            textAnchor="start"
            letterSpacing="-0.01em"
          >
            AI
          </text>

          {/* Sparkle Star over the letter 'I' */}
          <g className="hm-sparkle-star hm-sparkle-star-3" transform="translate(68, -48)">
            <path
              d="M 0 -13 Q 0 0, -13 0 Q 0 0, 0 13 Q 0 0, 13 0 Q 0 0, 0 -13 Z"
              fill={`url(#${uniqueId}-sparklePurple)`}
              filter={`url(#${uniqueId}-sparkleGlow)`}
            />
            <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
          </g>
        </g>

        {/* ── Tagline: "SMARTER HIRING. BETTER TEAMS." with Accent Bars ── */}
        {showTagline && (
          <g transform="translate(400, 435)" textAnchor="middle">
            {/* Left Accent Bar (Fading Purple) */}
            <line
              x1="-280"
              y1="-3"
              x2="-175"
              y2="-3"
              stroke={`url(#${uniqueId}-taglineBarLeft)`}
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Tagline Text */}
            <text
              x="0"
              y="0"
              className={`hm-text-tagline ${isDark ? 'hm-tagline-light' : 'hm-tagline-dark'}`}
              fontSize="14.5"
            >
              SMARTER HIRING. BETTER TEAMS.
            </text>

            {/* Right Accent Bar (Fading Cyan) */}
            <line
              x1="175"
              y1="-3"
              x2="280"
              y2="-3"
              stroke={`url(#${uniqueId}-taglineBarRight)`}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

// Gradient & Filter Definitions
function renderDefs(id: string) {
  return (
    <defs>
      {/* Ambient Ground Shadow */}
      <radialGradient id={`${id}-groundShadow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#0284C7" stopOpacity="0.4" />
        <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>

      {/* Orbital Ring Gradient */}
      <linearGradient id={`${id}-orbitGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="45%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>

      {/* Sparkle Star Gradients */}
      <linearGradient id={`${id}-sparklePurple`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E9D5FF" />
        <stop offset="40%" stopColor="#C084FC" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>

      <linearGradient id={`${id}-sparkleCyan`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="40%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>

      {/* Left Pillar 3D Gradients */}
      <linearGradient id={`${id}-leftPillarGrad`} x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="#9333EA" />
        <stop offset="35%" stopColor="#7C3AED" />
        <stop offset="75%" stopColor="#581C87" />
        <stop offset="100%" stopColor="#3B0764" />
      </linearGradient>

      <linearGradient id={`${id}-leftPillarBevel`} x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8" />
        <stop offset="45%" stopColor="#6B21A8" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#2E1065" stopOpacity="1" />
      </linearGradient>

      {/* AI Head Silhouette Gradient */}
      <linearGradient id={`${id}-headProfileGrad`} x1="10%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="35%" stopColor="#0EA5E9" />
        <stop offset="70%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>

      {/* 3D Wave Ribbon Face Gradient */}
      <linearGradient id={`${id}-ribbonFaceGrad`} x1="0%" y1="30%" x2="100%" y2="70%">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="25%" stopColor="#818CF8" />
        <stop offset="55%" stopColor="#38BDF8" />
        <stop offset="85%" stopColor="#00E5FF" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>

      {/* Ribbon Underfold Deep Shadow */}
      <linearGradient id={`${id}-ribbonUnderFold`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#581C87" />
        <stop offset="40%" stopColor="#4338CA" />
        <stop offset="80%" stopColor="#1D4ED8" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>

      {/* Resume Card Gradient */}
      <linearGradient id={`${id}-cardGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#F0F9FF" />
      </linearGradient>

      {/* Magnifier Lens Radial Gradient */}
      <radialGradient id={`${id}-magLensGrad`} cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="60%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#0369A1" />
      </radialGradient>

      {/* Specular Highlight Gradient */}
      <linearGradient id={`${id}-specularHighlight`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      {/* "AI" Wordmark Gradient */}
      <linearGradient id={`${id}-aiTextGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="45%" stopColor="#4F46E5" />
        <stop offset="80%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#00E5FF" />
      </linearGradient>

      {/* Tagline Accent Lines */}
      <linearGradient id={`${id}-taglineBarLeft`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
      </linearGradient>

      <linearGradient id={`${id}-taglineBarRight`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00E5FF" stopOpacity="1" />
        <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
      </linearGradient>

      <linearGradient id={`${id}-taglineRuleGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#00E5FF" />
      </linearGradient>

      {/* Internal Reflection Sweep Gradient */}
      <linearGradient id={`${id}-internalShineGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.05" />
        <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0.6" />
        <stop offset="52%" stopColor="#E0F2FE" stopOpacity="0.95" />
        <stop offset="56%" stopColor="#FFFFFF" stopOpacity="0.6" />
        <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      {/* Mask for Internal Reflection (Only shines ON the logo components) */}
      <mask id={`${id}-internalSheenMask`}>
        {/* White reveals, black hides */}
        <g fill="#FFFFFF">
          {/* Left Pillar */}
          <path d="M 285 105 C 285 85, 310 75, 335 78 C 348 80, 355 90, 355 105 L 355 210 C 335 215, 320 230, 320 250 L 320 300 C 320 310, 310 318, 298 318 C 288 318, 285 310, 285 298 Z" />
          {/* Head Profile */}
          <path d="M 420 85 C 420 62, 455 50, 495 54 C 522 58, 532 76, 536 94 C 539 106, 533 116, 530 122 C 538 126, 547 131, 547 138 C 547 142, 538 147, 534 152 C 539 158, 538 166, 532 170 C 536 176, 538 182, 534 188 C 526 198, 510 204, 502 214 L 498 300 C 498 310, 488 318, 476 318 L 434 318 C 424 318, 418 310, 418 300 Z" />
          {/* Ribbon Wave */}
          <path d="M 292 208 C 302 215, 320 222, 340 210 C 370 192, 395 155, 435 140 C 468 128, 492 145, 492 182 C 492 198, 482 208, 468 208 C 452 208, 445 198, 445 186 C 445 174, 435 168, 420 174 C 392 186, 368 218, 338 230 C 315 239, 298 228, 292 208 Z" />
          {/* Resume Card */}
          <rect x="438" y="196" width="76" height="98" rx="10" ry="10" />
          {/* Magnifier Glass */}
          <circle cx="492" cy="256" r="18" />
        </g>
      </mask>

      {/* Sparkle Glow Filter */}
      <filter id={`${id}-sparkleGlow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* 3D Drop Shadow */}
      <filter id={`${id}-dropShadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#0284C7" floodOpacity="0.32" />
      </filter>

      {/* Card Drop Shadow */}
      <filter id={`${id}-cardShadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="8" stdDeviation="8" floodColor="#0B132B" floodOpacity="0.25" />
      </filter>
    </defs>
  );
}

export default HireMindAiLogo;
