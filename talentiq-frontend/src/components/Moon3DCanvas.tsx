import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Moon, Play, Pause } from 'lucide-react';

interface Moon3DCanvasProps {
  interactive?: boolean;
  orbitSpeedMultiplier?: number;
}

export const Moon3DCanvas: React.FC<Moon3DCanvasProps> = ({
  interactive = true,
  orbitSpeedMultiplier = 1.0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(orbitSpeedMultiplier);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── 1. Scene & Camera Setup ──────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060a17, 0.0012);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 35, 175);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // ── 2. Lights ────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.4);
    scene.add(ambientLight);

    // Sunlight illuminating the Moon
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.8);
    sunLight.position.set(220, 90, 160);
    scene.add(sunLight);

    // Cosmic blue rim light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(-180, -40, -120);
    scene.add(rimLight);

    // Purple nebula fill light
    const fillLight = new THREE.PointLight(0xa855f7, 2.2, 500);
    fillLight.position.set(0, -120, 60);
    scene.add(fillLight);

    // ── 3. High-Detail Procedural Moon Texture ────────────────────
    const createMoonTexture = (): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Base lunar regolith gray gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#85929E');
      grad.addColorStop(0.5, '#BDC3C7');
      grad.addColorStop(1, '#7F8C8D');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Lunar Maria (Dark Basalt Plains / Seas)
      ctx.fillStyle = 'rgba(44, 62, 80, 0.6)';
      const mariaSpots = [
        { x: 340, y: 180, rx: 120, ry: 75 }, // Mare Imbrium
        { x: 580, y: 220, rx: 90, ry: 60 },  // Mare Serenitatis
        { x: 720, y: 200, rx: 80, ry: 50 },  // Mare Tranquillitatis
        { x: 420, y: 320, rx: 100, ry: 65 }, // Oceanus Procellarum
        { x: 260, y: 260, rx: 60, ry: 45 },
      ];
      mariaSpots.forEach(m => {
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.rx, m.ry, Math.random() * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Impact Craters with bright rims & dark centers
      for (let i = 0; i < 450; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const r = Math.random() * 14 + 2;

        ctx.fillStyle = `rgba(30, 41, 59, ${Math.random() * 0.5 + 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.2})`;
        ctx.lineWidth = Math.random() * 2 + 1;
        ctx.stroke();

        if (r > 8) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Micro surface noise
      for (let i = 0; i < 9000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      const map = new THREE.CanvasTexture(canvas);

      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = 512;
      bumpCanvas.height = 256;
      const bCtx = bumpCanvas.getContext('2d')!;
      bCtx.drawImage(canvas, 0, 0, 512, 256);
      const bump = new THREE.CanvasTexture(bumpCanvas);

      return { map, bump };
    };

    const { map: moonMap, bump: moonBump } = createMoonTexture();

    // ── 4. 3D Moon Mesh ──────────────────────────────────────────
    const moonGroup = new THREE.Group();
    // Offset Moon slightly to top-right to create breathtaking background composition
    moonGroup.position.set(45, 10, -10);
    scene.add(moonGroup);

    const moonGeometry = new THREE.SphereGeometry(36, 64, 64);
    const moonMaterial = new THREE.MeshStandardMaterial({
      map: moonMap,
      bumpMap: moonBump,
      bumpScale: 1.8,
      roughness: 0.82,
      metalness: 0.1,
    });
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonGroup.add(moonMesh);

    // ── 5. Lunar Atmospheric Glow / Halo ─────────────────────────
    const glowGeometry = new THREE.SphereGeometry(37.8, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.6);
          gl_FragColor = vec4(0.58, 0.77, 0.99, 1.0) * intensity * 1.6;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    moonGroup.add(glowMesh);

    // ── 6. Luminous Orbit Rings ──────────────────────────────────
    const createOrbitRing = (radius: number, color: number, opacity: number, tilt: number) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.85, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(120);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map(p => new THREE.Vector3(p.x, 0, p.y))
      );
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Line(geometry, material);
      ring.rotation.x = THREE.MathUtils.degToRad(tilt);
      ring.rotation.z = THREE.MathUtils.degToRad(15);
      return ring;
    };

    const ring1 = createOrbitRing(65, 0x60a5fa, 0.45, 25);
    const ring2 = createOrbitRing(85, 0xa855f7, 0.35, -20);
    const ring3 = createOrbitRing(110, 0x38bdf8, 0.25, 40);
    moonGroup.add(ring1);
    moonGroup.add(ring2);
    moonGroup.add(ring3);

    // ── 7. Orbiting Lunar Satellites ─────────────────────────────
    const satellites: { mesh: THREE.Mesh; orbitRadius: number; speed: number; angle: number; yOffset: number }[] = [];
    const satColors = [0x38bdf8, 0xa855f7, 0x34d399, 0xf472b6];

    for (let i = 0; i < 4; i++) {
      const satGeo = new THREE.SphereGeometry(1.5, 16, 16);
      const satMat = new THREE.MeshBasicMaterial({ color: satColors[i] });
      const satMesh = new THREE.Mesh(satGeo, satMat);

      const haloGeo = new THREE.SphereGeometry(2.6, 8, 8);
      const haloMat = new THREE.MeshBasicMaterial({
        color: satColors[i],
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });
      satMesh.add(new THREE.Mesh(haloGeo, haloMat));

      satellites.push({
        mesh: satMesh,
        orbitRadius: 60 + i * 18,
        speed: 0.008 + i * 0.003,
        angle: (i * Math.PI) / 2,
        yOffset: (i - 1.5) * 10,
      });
      moonGroup.add(satMesh);
    }

    // ── 8. Starfield & Silvery Moon Dust Particles ────────────────
    const particleCount = 1500;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1100;
      positions[i + 1] = (Math.random() - 0.5) * 700;
      positions[i + 2] = (Math.random() - 0.5) * 1100;

      const rChoice = Math.random();
      if (rChoice > 0.6) {
        colors[i] = 0.85; colors[i + 1] = 0.92; colors[i + 2] = 1.0;
      } else if (rChoice > 0.3) {
        colors[i] = 0.65; colors[i + 1] = 0.78; colors[i + 2] = 0.98;
      } else {
        colors[i] = 0.85; colors[i + 1] = 0.68; colors[i + 2] = 0.98;
      }
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── 9. Distant Earth ─────────────────────────────────────────
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-160, 70, -240);
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(16, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.55,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // ── 10. Mouse Interaction & Parallax ─────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      mouseX = x * 2;
      mouseY = y * 2;
      targetRotationY = mouseX * 0.45;
      targetRotationX = mouseY * 0.3;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // ── 11. Animation Loop ───────────────────────────────────────
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock.getDelta();

      if (!isPaused) {
        // Moon axial rotation
        moonMesh.rotation.y += 0.0028 * speed;
        moonMesh.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.04;

        // Smooth mouse parallax
        moonGroup.rotation.y += (targetRotationY - moonGroup.rotation.y) * 0.04;
        moonGroup.rotation.x += (targetRotationX - moonGroup.rotation.x) * 0.04;

        // Rotate Orbit Rings
        ring1.rotation.y += 0.002 * speed;
        ring2.rotation.y -= 0.0015 * speed;
        ring3.rotation.y += 0.001 * speed;

        // Animate Satellites
        satellites.forEach((sat) => {
          sat.angle += sat.speed * speed;
          sat.mesh.position.x = Math.cos(sat.angle) * sat.orbitRadius;
          sat.mesh.position.z = Math.sin(sat.angle) * sat.orbitRadius * 0.85;
          sat.mesh.position.y = Math.sin(sat.angle * 2) * 6 + sat.yOffset;
        });

        // Drift particles
        particles.rotation.y += 0.0003;
        particles.rotation.x += 0.00015;

        // Distant Earth slow spin
        earthMesh.rotation.y += 0.002;
      }

      renderer.render(scene, camera);
    };

    animate();

    // ── 12. Resize Handler ───────────────────────────────────────
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [interactive, speed, isPaused]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 65% 25%, #0e1738 0%, #050816 100%)',
      }}
    >
      {/* Subtle overlay controls in bottom left for speed/pause manipulation */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          zIndex: 20,
          display: 'flex',
          gap: 10,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '7px 14px',
          borderRadius: 20,
          border: '1px solid rgba(147, 197, 253, 0.3)',
          color: '#94a3b8',
          fontSize: 12,
          alignItems: 'center',
          userSelect: 'none',
          pointerEvents: 'auto',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#e2e8f0', fontWeight: 700 }}>
          <Moon size={13} color="#93C5FD" /> Lunar 3D Horizon
        </span>
        <span style={{ opacity: 0.4 }}>|</span>
        <button
          onClick={() => setSpeed((s) => (s === 1 ? 2.5 : s === 2.5 ? 0.5 : 1))}
          style={{
            background: 'none',
            border: 'none',
            color: '#38bdf8',
            cursor: 'pointer',
            fontSize: 11.5,
            fontWeight: 600,
            padding: '2px 4px',
          }}
          title="Adjust Orbit Speed"
        >
          {speed === 1 ? '1x Speed' : speed === 2.5 ? '2.5x Warp' : '0.5x Slow'}
        </button>
        <span style={{ opacity: 0.4 }}>|</span>
        <button
          onClick={() => setIsPaused((p) => !p)}
          style={{
            background: 'none',
            border: 'none',
            color: isPaused ? '#f59e0b' : '#34d399',
            cursor: 'pointer',
            fontSize: 11.5,
            fontWeight: 600,
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  );
};
export default Moon3DCanvas;
