import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  alpha: number;
  pulseSpeed: number;
}

interface InteractiveGalaxyProps {
  theme?: 'universe' | 'light';
  particleCount?: number;
  mouseRadius?: number;
}

export const InteractiveGalaxyBackground: React.FC<InteractiveGalaxyProps> = ({
  theme = 'universe',
  particleCount = 130,
  mouseRadius = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null; radius: number; isHovering: boolean }>({
    x: null,
    y: null,
    radius: mouseRadius,
    isHovering: false,
  });

  const isUniverse = theme === 'universe';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Particle Palette
    const galaxyColors = isUniverse
      ? ['#A78BFA', '#818CF8', '#38BDF8', '#C084FC', '#F472B6', '#34D399', '#FBBF24', '#FFFFFF']
      : ['#6366F1', '#3B82F6', '#0EA5E9', '#8B5CF6', '#10B981'];

    // Initialize particles
    const particles: Particle[] = [];
    const count = Math.min(particleCount, Math.floor((window.innerWidth * window.innerHeight) / 9000));

    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: Math.random() * 2.2 + 0.8,
        color: galaxyColors[Math.floor(Math.random() * galaxyColors.length)],
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        alpha: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    // Shooting comets
    const comets: { x: number; y: number; length: number; speed: number; angle: number; alpha: number }[] = [];

    const spawnComet = () => {
      if (Math.random() < 0.015 && comets.length < 2) {
        comets.push({
          x: Math.random() * canvas.width * 0.9,
          y: Math.random() * canvas.height * 0.4,
          length: Math.random() * 70 + 40,
          speed: Math.random() * 5 + 3,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
          alpha: 0.9,
        });
      }
    };

    // Mouse move handler for attraction & motion
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
      mouseRef.current.isHovering = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Animation Render Loop
    let time = 0;

    const render = () => {
      time += 0.01;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Deep space cosmic gradient in Universe mode
      if (isUniverse) {
        const bgGrad = ctx.createRadialGradient(
          mouseRef.current.x || w / 2,
          mouseRef.current.y || h / 2,
          50,
          w / 2,
          h / 2,
          Math.max(w, h)
        );
        bgGrad.addColorStop(0, 'rgba(20, 14, 45, 0.45)');
        bgGrad.addColorStop(0.4, 'rgba(10, 14, 30, 0.6)');
        bgGrad.addColorStop(1, 'rgba(5, 7, 18, 0.85)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Render Comets
      if (isUniverse) {
        spawnComet();
        for (let i = comets.length - 1; i >= 0; i--) {
          const c = comets[i];
          c.x += Math.cos(c.angle) * c.speed;
          c.y += Math.sin(c.angle) * c.speed;
          c.alpha -= 0.012;

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
          grad.addColorStop(0.3, `rgba(168, 85, 247, ${c.alpha * 0.7})`);
          grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x - Math.cos(c.angle) * c.length, c.y - Math.sin(c.angle) * c.length);
          ctx.stroke();
        }
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mRadius = mouseRef.current.radius;

      // Update & Draw Particles with Mouse Attraction
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Natural drifting motion
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around screen boundaries
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Mouse Attraction / Gravitational swirl
        if (mx !== null && my !== null) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mRadius && dist > 1) {
            // Gravitational pull force towards cursor
            const force = (1 - dist / mRadius) * 2.8;
            const angle = Math.atan2(dy, dx);
            
            // Attract towards mouse + gentle tangential swirl
            p.x += Math.cos(angle) * force + Math.sin(angle) * 0.8;
            p.y += Math.sin(angle) * force - Math.cos(angle) * 0.8;
          }
        }

        // Pulse alpha
        const currentAlpha = Math.max(0.2, Math.min(0.95, p.alpha + Math.sin(time * 3 + i) * 0.2));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isUniverse
          ? `rgba(220, 230, 255, ${currentAlpha})`
          : `rgba(99, 102, 241, ${currentAlpha * 0.6})`;
        ctx.shadowBlur = p.size > 1.8 ? 8 : 0;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect nearby particles with glowing Constellation lines (especially near mouse)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distP = Math.hypot(p.x - p2.x, p.y - p2.y);
          const maxLineDist = isUniverse ? 95 : 70;

          if (distP < maxLineDist) {
            let lineAlpha = (1 - distP / maxLineDist) * (isUniverse ? 0.25 : 0.15);

            // Boost constellation lines near mouse hover
            if (mx !== null && my !== null) {
              const mouseToP = Math.hypot(mx - p.x, my - p.y);
              if (mouseToP < mRadius) {
                lineAlpha *= 1.8;
              }
            }

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isUniverse
              ? `rgba(167, 139, 250, ${Math.min(0.6, lineAlpha)})`
              : `rgba(99, 102, 241, ${Math.min(0.3, lineAlpha)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, isUniverse, particleCount, mouseRadius]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default InteractiveGalaxyBackground;
