import React, { useEffect, useRef, useState } from 'react';
import '../css/cosmic-solar.css';

interface Planet {
  name: string;
  distance: number; // orbital radius in px
  radius: number;   // planet size in px
  speed: number;    // orbital speed multiplier
  color: string;
  ring?: boolean;
  moons?: number;
  info: string;
}

const PLANETS: Planet[] = [
  { name: 'Mercury', distance: 68, radius: 4, speed: 4.15, color: '#A5A5A5', info: 'Closest to the Sun' },
  { name: 'Venus', distance: 96, radius: 6.5, speed: 1.62, color: '#E3BB76', info: 'Hottest terrestrial world' },
  { name: 'Earth', distance: 132, radius: 7.5, speed: 1.0, color: '#4F92FF', moons: 1, info: 'Home Planet & Life Oasis' },
  { name: 'Mars', distance: 168, radius: 5.5, speed: 0.53, color: '#E25B38', info: 'The Red Planet' },
  { name: 'Jupiter', distance: 220, radius: 14, speed: 0.28, color: '#D9A066', info: 'Giant of the Solar System' },
  { name: 'Saturn', distance: 275, radius: 11.5, speed: 0.19, color: '#F4D29C', ring: true, info: 'Ringed Cosmic Wonder' },
  { name: 'Uranus', distance: 330, radius: 9, speed: 0.12, color: '#7DE3F4', ring: true, info: 'Ice Giant with Tilted Axis' },
  { name: 'Neptune', distance: 380, radius: 8.5, speed: 0.08, color: '#3A68F8', info: 'Deep Blue Supersonic Winds' },
];

export const CosmicSolarBackground: React.FC<{
  title?: string;
  showOrbits?: boolean;
  interactive?: boolean;
}> = ({ title = 'Galaxy Solar System', showOrbits = true, interactive = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const anglesRef = useRef<number[]>(PLANETS.map((_, i) => (i * (Math.PI * 2)) / PLANETS.length));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 450;
    };

    resize();
    window.addEventListener('resize', resize);

    // Star generation
    const starCount = 180;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.02 + 0.005,
      direction: Math.random() > 0.5 ? 1 : -1
    }));

    // Shooting stars
    const comets: { x: number; y: number; length: number; speed: number; angle: number; alpha: number }[] = [];

    const spawnComet = () => {
      if (Math.random() < 0.03 && comets.length < 3) {
        comets.push({
          x: Math.random() * canvas.width * 0.8,
          y: Math.random() * canvas.height * 0.3,
          length: Math.random() * 80 + 50,
          speed: Math.random() * 6 + 4,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
          alpha: 1.0
        });
      }
    };

    let sunPulse = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Deep space nebula backdrop
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h));
      bgGrad.addColorStop(0, 'rgba(26, 16, 51, 0.95)');
      bgGrad.addColorStop(0.35, 'rgba(13, 17, 38, 0.98)');
      bgGrad.addColorStop(0.7, 'rgba(8, 11, 26, 1)');
      bgGrad.addColorStop(1, 'rgba(4, 6, 15, 1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Twinkling stars
      stars.forEach(s => {
        s.alpha += s.speed * s.direction;
        if (s.alpha > 0.95 || s.alpha < 0.15) s.direction *= -1;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 240, 255, ${Math.max(0.1, Math.min(1, s.alpha))})`;
        ctx.shadowBlur = s.radius > 1.2 ? 6 : 0;
        ctx.shadowColor = '#80D0FF';
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Shooting stars
      spawnComet();
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += Math.cos(c.angle) * c.speed;
        c.y += Math.sin(c.angle) * c.speed;
        c.alpha -= 0.015;

        if (c.alpha <= 0 || c.x > w || c.y > h) {
          comets.splice(i, 1);
          continue;
        }

        const grad = ctx.createLinearGradient(
          c.x, c.y,
          c.x - Math.cos(c.angle) * c.length,
          c.y - Math.sin(c.angle) * c.length
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${c.alpha})`);
        grad.addColorStop(0.3, `rgba(130, 200, 255, ${c.alpha * 0.8})`);
        grad.addColorStop(1, 'rgba(120, 50, 255, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x - Math.cos(c.angle) * c.length, c.y - Math.sin(c.angle) * c.length);
        ctx.stroke();
      }

      // ── Central Glowing Sun with Solar Corona ──
      sunPulse += 0.03;
      const pulseRadius = 24 + Math.sin(sunPulse) * 2;

      // Outer Corona Flares
      const sunGlow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 75);
      sunGlow.addColorStop(0, 'rgba(255, 245, 180, 1)');
      sunGlow.addColorStop(0.2, 'rgba(255, 175, 40, 0.85)');
      sunGlow.addColorStop(0.5, 'rgba(240, 90, 20, 0.45)');
      sunGlow.addColorStop(0.8, 'rgba(160, 40, 120, 0.15)');
      sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(cx, cy, 75, 0, Math.PI * 2);
      ctx.fillStyle = sunGlow;
      ctx.fill();

      // Sun Core
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius);
      coreGlow.addColorStop(0, '#FFFFFF');
      coreGlow.addColorStop(0.3, '#FFF394');
      coreGlow.addColorStop(0.7, '#FFA826');
      coreGlow.addColorStop(1, '#FF4500');

      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGlow;
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#FF8C00';
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Planet Orbits and Bodies ──
      const orbitScale = Math.min(w / 880, h / 540, 1.25);

      PLANETS.forEach((planet, index) => {
        const radius = planet.distance * orbitScale;

        // Draw orbital track
        if (showOrbits) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = hoveredPlanet === planet.name ? 'rgba(168, 85, 247, 0.6)' : 'rgba(130, 145, 195, 0.18)';
          ctx.lineWidth = hoveredPlanet === planet.name ? 1.5 : 1;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Update angle if not paused
        if (!isPaused) {
          anglesRef.current[index] += 0.008 * planet.speed * speedMultiplier;
        }

        const currentAngle = anglesRef.current[index];
        const px = cx + Math.cos(currentAngle) * radius;
        const py = cy + Math.sin(currentAngle) * radius;

        // Planet Shadow & Day/Night lighting
        const pSize = Math.max(3, planet.radius * Math.min(orbitScale, 1.1));

        // Planet atmosphere glow
        ctx.beginPath();
        ctx.arc(px, py, pSize + 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${parseInt(planet.color.slice(1, 3), 16) || 120}, ${parseInt(planet.color.slice(3, 5), 16) || 150}, ${parseInt(planet.color.slice(5, 7), 16) || 240}, 0.25)`;
        ctx.fill();

        // Planet Body
        const planetGrad = ctx.createRadialGradient(
          px - pSize * 0.35, py - pSize * 0.35, pSize * 0.1,
          px, py, pSize
        );
        planetGrad.addColorStop(0, '#FFFFFF');
        planetGrad.addColorStop(0.3, planet.color);
        planetGrad.addColorStop(1, '#0A0A14');

        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = planetGrad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = planet.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Saturn / Uranus Rings
        if (planet.ring) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.PI / 6);
          ctx.beginPath();
          ctx.ellipse(0, 0, pSize * 2.2, pSize * 0.65, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(230, 205, 160, 0.65)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        }

        // Earth's Moon
        if (planet.moons && planet.moons > 0) {
          const moonAngle = currentAngle * 6;
          const mx = px + Math.cos(moonAngle) * (pSize + 7);
          const my = py + Math.sin(moonAngle) * (pSize + 7);
          ctx.beginPath();
          ctx.arc(mx, my, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#E8E8E8';
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#FFFFFF';
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Planet Name Label
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = hoveredPlanet === planet.name ? '#C084FC' : 'rgba(203, 213, 225, 0.75)';
        ctx.textAlign = 'center';
        ctx.fillText(planet.name, px, py + pSize + 13);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [speedMultiplier, isPaused, showOrbits, hoveredPlanet]);

  return (
    <div className="cosmic-solar-wrapper">
      <canvas ref={canvasRef} className="cosmic-solar-canvas" />

      {/* Floating Solar Header Bar */}
      <div className="cosmic-solar-controls">
        <div className="cosmic-solar-tag">
          <span className="cosmic-sun-indicator" />
          <span className="cosmic-solar-title">{title}</span>
        </div>

        {interactive && (
          <div className="cosmic-solar-btn-group">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`cosmic-btn ${isPaused ? 'active' : ''}`}
              title={isPaused ? 'Resume Orbit Motion' : 'Pause Orbit Motion'}
            >
              {isPaused ? '▶ Play' : '⏸ Pause'}
            </button>
            <button
              onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 0.5 : 1)}
              className="cosmic-btn"
              title="Change Orbital Speed"
            >
              ⚡ {speedMultiplier}x Speed
            </button>
          </div>
        )}
      </div>

      {/* Interactive Planet Quick Legend */}
      <div className="cosmic-planet-legend">
        {PLANETS.map(p => (
          <div
            key={p.name}
            className={`cosmic-legend-item ${hoveredPlanet === p.name ? 'highlighted' : ''}`}
            onMouseEnter={() => setHoveredPlanet(p.name)}
            onMouseLeave={() => setHoveredPlanet(null)}
          >
            <span className="cosmic-planet-dot" style={{ background: p.color }} />
            <span>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CosmicSolarBackground;
