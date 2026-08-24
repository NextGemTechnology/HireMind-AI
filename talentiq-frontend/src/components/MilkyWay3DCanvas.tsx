import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MilkyWay3DCanvasProps {
  interactive?: boolean;
  showOrbits?: boolean;
  orbitSpeedMultiplier?: number;
}

export const MilkyWay3DCanvas: React.FC<MilkyWay3DCanvasProps> = ({
  interactive = true,
  showOrbits = true,
  orbitSpeedMultiplier = 1.0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const speed = orbitSpeedMultiplier;
  const isPaused = false;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── 1. Scene & Camera Setup ──────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.0018);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 75, 230);
    camera.lookAt(0, -10, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ── 2. Lights ─────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x334155, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xfff7ed, 4.0, 600, 1.2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const cosmicLight1 = new THREE.DirectionalLight(0x818cf8, 1.2);
    cosmicLight1.position.set(100, 150, 100);
    scene.add(cosmicLight1);

    const cosmicLight2 = new THREE.DirectionalLight(0x06b6d4, 0.8);
    cosmicLight2.position.set(-120, -80, -100);
    scene.add(cosmicLight2);

    // ── 3. Texture Generation Helpers ─────────────────────────────
    const createSunTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 256);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#fef08a');
      grad.addColorStop(0.5, '#f59e0b');
      grad.addColorStop(0.8, '#ea580c');
      grad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Solar flare granularity
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 12 + 2;
        ctx.fillStyle = `rgba(255, 235, 150, ${Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      return new THREE.CanvasTexture(canvas);
    };

    const createPlanetTexture = (baseColor: string, bandColors: string[], detailType: 'bands' | 'spots' | 'clouds' | 'craters'): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 512, 256);

      if (detailType === 'bands') {
        // Jupiter / Saturn stripes
        for (let y = 0; y < 256; y += 4) {
          const color = bandColors[Math.floor(Math.random() * bandColors.length)];
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.45 + Math.sin(y * 0.1) * 0.35;
          ctx.fillRect(0, y, 512, Math.random() * 6 + 2);
        }
        // Great Red Spot
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.ellipse(320, 160, 36, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (detailType === 'clouds') {
        // Earth continents & atmosphere
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 256;
          const r = Math.random() * 45 + 15;
          ctx.fillStyle = bandColors[i % bandColors.length];
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // Swirling White Clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        for (let i = 0; i < 25; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 256;
          ctx.beginPath();
          ctx.ellipse(x, y, Math.random() * 70 + 20, Math.random() * 15 + 5, Math.random() * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (detailType === 'craters') {
        // Mercury / Mars craters
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 120; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 256;
          const r = Math.random() * 8 + 2;
          ctx.fillStyle = bandColors[i % bandColors.length];
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Venus smooth gradient
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        bandColors.forEach((col, idx) => {
          grad.addColorStop(idx / (bandColors.length - 1), col);
        });
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(0, 0, 512, 256);
      }

      ctx.globalAlpha = 1.0;
      return new THREE.CanvasTexture(canvas);
    };

    // ── 4. Milky Way Spiral Galaxy (25,000+ Particle System) ──────
    const galaxyParams = {
      count: 24000,
      size: 0.85,
      radius: 280,
      branches: 4,
      spin: 1.3,
      randomness: 0.45,
      power: 3.2,
      insideColor: '#fde047',
      coreColor: '#f43f5e',
      outsideColor: '#38bdf8',
      nebulaColor: '#818cf8',
    };

    const galaxyGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(galaxyParams.count * 3);
    const colors = new Float32Array(galaxyParams.count * 3);
    const scales = new Float32Array(galaxyParams.count);

    const insideColor = new THREE.Color(galaxyParams.insideColor);
    const coreColor = new THREE.Color(galaxyParams.coreColor);
    const outsideColor = new THREE.Color(galaxyParams.outsideColor);
    const nebulaColor = new THREE.Color(galaxyParams.nebulaColor);

    for (let i = 0; i < galaxyParams.count; i++) {
      const i3 = i * 3;
      const radius = Math.random() * galaxyParams.radius;
      const spinAngle = radius * galaxyParams.spin * 0.015;
      const branchAngle = ((i % galaxyParams.branches) / galaxyParams.branches) * Math.PI * 2;

      const randomX = Math.pow(Math.random(), galaxyParams.power) * (Math.random() < 0.5 ? 1 : -1) * galaxyParams.randomness * radius;
      const randomY = Math.pow(Math.random(), galaxyParams.power) * (Math.random() < 0.5 ? 1 : -1) * (galaxyParams.randomness * 0.4) * radius;
      const randomZ = Math.pow(Math.random(), galaxyParams.power) * (Math.random() < 0.5 ? 1 : -1) * galaxyParams.randomness * radius;

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      positions[i3 + 1] = randomY - 20; // Lower galactic disc slightly
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

      // Color interpolation from core to outer arms
      const mixedColor = insideColor.clone();
      if (radius < 40) {
        mixedColor.lerp(coreColor, radius / 40);
      } else if (radius < 140) {
        mixedColor.lerp(nebulaColor, (radius - 40) / 100);
      } else {
        mixedColor.lerp(outsideColor, (radius - 140) / (galaxyParams.radius - 140));
      }

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      scales[i] = Math.random() * 1.5 + 0.5;
    }

    galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circle texture for soft glow star particles
    const getParticleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.2, 'rgba(255,255,255,0.85)');
      gradient.addColorStop(0.5, 'rgba(165,180,252,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(canvas);
    };

    const particleTexture = getParticleTexture();

    const galaxyMaterial = new THREE.PointsMaterial({
      size: galaxyParams.size,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.9,
    });

    const galaxyPoints = new THREE.Points(galaxyGeometry, galaxyMaterial);
    galaxyPoints.rotation.x = 0.38; // 3D galactic inclination tilt
    galaxyPoints.rotation.z = -0.2;
    scene.add(galaxyPoints);

    // ── 5. Ambient Deep Space Starfield (Twinkling Stars) ─────────
    const starfieldCount = 3500;
    const starfieldGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starfieldCount * 3);
    const starColors = new Float32Array(starfieldCount * 3);

    for (let i = 0; i < starfieldCount; i++) {
      const i3 = i * 3;
      const dist = 400 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i3] = dist * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = dist * Math.cos(phi);

      const tint = Math.random();
      if (tint > 0.8) {
        starColors[i3] = 0.7; starColors[i3 + 1] = 0.85; starColors[i3 + 2] = 1.0; // Blue star
      } else if (tint > 0.6) {
        starColors[i3] = 1.0; starColors[i3 + 1] = 0.9; starColors[i3 + 2] = 0.6; // Gold star
      } else {
        starColors[i3] = 0.95; starColors[i3 + 1] = 0.95; starColors[i3 + 2] = 1.0; // White star
      }
    }

    starfieldGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starfieldGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starfieldMat = new THREE.PointsMaterial({
      size: 1.2,
      map: particleTexture,
      transparent: true,
      opacity: 0.75,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starfield = new THREE.Points(starfieldGeo, starfieldMat);
    scene.add(starfield);

    // ── 6. Central Star (Sun) & Coronal Glow ──────────────────────
    const solarSystemGroup = new THREE.Group();
    solarSystemGroup.position.set(0, 0, 0);
    solarSystemGroup.rotation.x = 0.28; // Planetary orbital inclination
    solarSystemGroup.rotation.z = -0.12;
    scene.add(solarSystemGroup);

    const sunGeo = new THREE.SphereGeometry(9.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      map: createSunTexture(),
      color: 0xfffbeb,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    solarSystemGroup.add(sunMesh);

    // Sun atmospheric glow sprite
    const sunGlowMat = new THREE.SpriteMaterial({
      map: particleTexture,
      color: 0xffaa33,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const sunGlow = new THREE.Sprite(sunGlowMat);
    sunGlow.scale.set(38, 38, 1);
    solarSystemGroup.add(sunGlow);

    // Outer coronal aura
    const sunOuterGlowMat = new THREE.SpriteMaterial({
      map: particleTexture,
      color: 0xec4899,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const sunOuterGlow = new THREE.Sprite(sunOuterGlowMat);
    sunOuterGlow.scale.set(65, 65, 1);
    solarSystemGroup.add(sunOuterGlow);

    // ── 7. 3D Orbiting Planets & Systems ──────────────────────────
    interface PlanetData {
      name: string;
      radius: number;
      distance: number;
      speed: number;
      rotationSpeed: number;
      baseColor: string;
      bandColors: string[];
      detailType: 'bands' | 'spots' | 'clouds' | 'craters';
      hasRings?: boolean;
      ringInner?: number;
      ringOuter?: number;
      hasMoon?: boolean;
      orbitInclination?: number;
      mesh?: THREE.Mesh;
      group?: THREE.Group;
      angle: number;
      orbitLine?: THREE.Line;
      moonMesh?: THREE.Mesh;
      moonAngle?: number;
    }

    const planetsData: PlanetData[] = [
      {
        name: 'Mercury',
        radius: 1.2,
        distance: 24,
        speed: 1.8,
        rotationSpeed: 0.02,
        baseColor: '#a3a3a3',
        bandColors: ['#737373', '#525252', '#d4d4d4'],
        detailType: 'craters',
        orbitInclination: 0.08,
        angle: Math.random() * Math.PI * 2,
      },
      {
        name: 'Venus',
        radius: 1.9,
        distance: 36,
        speed: 1.3,
        rotationSpeed: -0.015,
        baseColor: '#eab308',
        bandColors: ['#fef08a', '#ca8a04', '#d97706'],
        detailType: 'spots',
        orbitInclination: -0.05,
        angle: Math.random() * Math.PI * 2,
      },
      {
        name: 'Earth',
        radius: 2.3,
        distance: 52,
        speed: 1.0,
        rotationSpeed: 0.03,
        baseColor: '#0284c7',
        bandColors: ['#15803d', '#166534', '#0369a1'],
        detailType: 'clouds',
        hasMoon: true,
        orbitInclination: 0.02,
        angle: Math.random() * Math.PI * 2,
      },
      {
        name: 'Mars',
        radius: 1.5,
        distance: 68,
        speed: 0.78,
        rotationSpeed: 0.025,
        baseColor: '#dc2626',
        bandColors: ['#991b1b', '#b91c1c', '#f87171'],
        detailType: 'craters',
        orbitInclination: 0.06,
        angle: Math.random() * Math.PI * 2,
      },
      {
        name: 'Jupiter',
        radius: 5.2,
        distance: 92,
        speed: 0.45,
        rotationSpeed: 0.045,
        baseColor: '#d97706',
        bandColors: ['#b45309', '#f59e0b', '#fed7aa', '#78350f'],
        detailType: 'bands',
        orbitInclination: -0.03,
        angle: Math.random() * Math.PI * 2,
      },
      {
        name: 'Saturn',
        radius: 4.2,
        distance: 122,
        speed: 0.32,
        rotationSpeed: 0.04,
        baseColor: '#e2b36e',
        bandColors: ['#ca8a04', '#fde047', '#a16207'],
        detailType: 'bands',
        hasRings: true,
        ringInner: 5.8,
        ringOuter: 11.5,
        orbitInclination: 0.05,
        angle: Math.random() * Math.PI * 2,
      },
      {
        name: 'Uranus',
        radius: 2.8,
        distance: 154,
        speed: 0.22,
        rotationSpeed: -0.03,
        baseColor: '#06b6d4',
        bandColors: ['#67e8f9', '#0891b2', '#22d3ee'],
        detailType: 'spots',
        hasRings: true,
        ringInner: 3.6,
        ringOuter: 5.2,
        orbitInclination: -0.04,
        angle: Math.random() * Math.PI * 2,
      },
      {
        name: 'Neptune',
        radius: 2.6,
        distance: 182,
        speed: 0.16,
        rotationSpeed: 0.032,
        baseColor: '#2563eb',
        bandColors: ['#1d4ed8', '#3b82f6', '#1e40af'],
        detailType: 'spots',
        orbitInclination: 0.03,
        angle: Math.random() * Math.PI * 2,
      },
    ];

    // Instantiate 3D meshes & orbits
    planetsData.forEach((planet) => {
      // 1. Orbital Ring Track
      if (showOrbits) {
        const orbitPoints: THREE.Vector3[] = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const x = Math.cos(theta) * planet.distance;
          const z = Math.sin(theta) * planet.distance;
          const y = Math.sin(theta) * (planet.distance * (planet.orbitInclination || 0));
          orbitPoints.push(new THREE.Vector3(x, y, z));
        }

        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMaterial = new THREE.LineBasicMaterial({
          color: 0x6366f1,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
        });

        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        solarSystemGroup.add(orbitLine);
        planet.orbitLine = orbitLine;
      }

      // 2. Planet Container Group
      const planetGroup = new THREE.Group();
      solarSystemGroup.add(planetGroup);
      planet.group = planetGroup;

      // 3. Planet Mesh
      const texture = createPlanetTexture(planet.baseColor, planet.bandColors, planet.detailType);
      const planetGeo = new THREE.SphereGeometry(planet.radius, 32, 32);
      const planetMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.75,
        metalness: 0.1,
      });

      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      planetMesh.castShadow = true;
      planetMesh.receiveShadow = true;
      planetGroup.add(planetMesh);
      planet.mesh = planetMesh;

      // 4. Planet Atmosphere Glow Sprite
      const atmoMat = new THREE.SpriteMaterial({
        map: particleTexture,
        color: new THREE.Color(planet.baseColor),
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      });
      const atmoSprite = new THREE.Sprite(atmoMat);
      atmoSprite.scale.set(planet.radius * 3.2, planet.radius * 3.2, 1);
      planetGroup.add(atmoSprite);

      // 5. 3D Rings (Saturn / Uranus)
      if (planet.hasRings && planet.ringInner && planet.ringOuter) {
        const ringGeo = new THREE.RingGeometry(planet.ringInner, planet.ringOuter, 64);
        // Rotate ring to horizontal orientation
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(planet.baseColor).offsetHSL(0, 0, 0.1),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
        });

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.3; // Dramatic 3D ring tilt
        ringMesh.rotation.y = 0.15;
        planetGroup.add(ringMesh);
      }

      // 6. Moon (Earth)
      if (planet.hasMoon) {
        const moonGeo = new THREE.SphereGeometry(0.55, 16, 16);
        const moonMat = new THREE.MeshStandardMaterial({
          color: 0xd4d4d4,
          roughness: 0.9,
        });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        planetGroup.add(moonMesh);
        planet.moonMesh = moonMesh;
        planet.moonAngle = 0;
      }
    });

    // ── 8. Shooting Stars (Meteors) ───────────────────────────────
    interface ShootingStar {
      mesh: THREE.Line;
      speed: number;
      life: number;
      maxLife: number;
      active: boolean;
    }

    const shootingStars: ShootingStar[] = [];
    for (let i = 0; i < 4; i++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -25),
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      const starLine = new THREE.Line(lineGeo, lineMat);
      scene.add(starLine);

      shootingStars.push({
        mesh: starLine,
        speed: 4.5 + Math.random() * 3.5,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        active: false,
      });
    }

    const spawnShootingStar = (star: ShootingStar) => {
      const startX = (Math.random() - 0.5) * 350;
      const startY = 50 + Math.random() * 100;
      const startZ = (Math.random() - 0.5) * 200;

      star.mesh.position.set(startX, startY, startZ);
      star.mesh.rotation.x = -0.4 + (Math.random() - 0.5) * 0.3;
      star.mesh.rotation.y = (Math.random() - 0.5) * 1.5;
      star.mesh.rotation.z = (Math.random() - 0.5) * 0.5;

      star.life = 0;
      star.active = true;
    };

    // ── 9. Mouse / Touch Interactive Camera Parallax ──────────────
    let targetCameraX = 0;
    let targetCameraY = 75;
    let targetCameraZ = 230;
    let targetSceneRotY = 0;
    let targetSceneRotX = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;

      targetCameraX = normX * 35;
      targetCameraY = 75 + normY * 25;
      targetSceneRotY = normX * 0.18;
      targetSceneRotX = -normY * 0.12;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!interactive || e.touches.length === 0) return;
      const touch = e.touches[0];
      const normX = (touch.clientX / window.innerWidth) * 2 - 1;
      const normY = -(touch.clientY / window.innerHeight) * 2 + 1;

      targetCameraX = normX * 25;
      targetCameraY = 75 + normY * 18;
      targetSceneRotY = normX * 0.12;
      targetSceneRotX = -normY * 0.08;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    // ── 10. Resize Handler ─────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // ── 11. 60 FPS Render Loop ─────────────────────────────────────
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const currentSpeed = isPaused ? 0 : speed;

      // 1. Galaxy core & arms rotation
      galaxyPoints.rotation.y += 0.0008 * currentSpeed;
      starfield.rotation.y += 0.00015;

      // 2. Sun rotation & coronal pulse
      sunMesh.rotation.y += 0.006 * currentSpeed;
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.5) * 0.06;
      sunGlow.scale.set(38 * pulse, 38 * pulse, 1);

      // 3. Orbiting Planets revolution & axial rotation
      planetsData.forEach((planet) => {
        if (!isPaused) {
          planet.angle += planet.speed * 0.007 * currentSpeed;
        }

        const x = Math.cos(planet.angle) * planet.distance;
        const z = Math.sin(planet.angle) * planet.distance;
        const y = Math.sin(planet.angle) * (planet.distance * (planet.orbitInclination || 0));

        if (planet.group) {
          planet.group.position.set(x, y, z);
        }

        if (planet.mesh) {
          planet.mesh.rotation.y += planet.rotationSpeed * currentSpeed;
        }

        // Earth's Moon
        if (planet.moonMesh && planet.moonAngle !== undefined) {
          if (!isPaused) {
            planet.moonAngle += 0.05 * currentSpeed;
          }
          const moonDist = 4.2;
          planet.moonMesh.position.set(
            Math.cos(planet.moonAngle) * moonDist,
            Math.sin(planet.moonAngle * 0.5) * 1.2,
            Math.sin(planet.moonAngle) * moonDist
          );
        }
      });

      // 4. Shooting Stars
      shootingStars.forEach((star) => {
        if (star.active) {
          star.life++;
          star.mesh.translateZ(star.speed);
          const mat = star.mesh.material as THREE.LineBasicMaterial;
          const progress = star.life / star.maxLife;

          if (progress < 0.3) {
            mat.opacity = progress / 0.3;
          } else if (progress > 0.7) {
            mat.opacity = 1 - (progress - 0.7) / 0.3;
          } else {
            mat.opacity = 1.0;
          }

          if (star.life >= star.maxLife) {
            star.active = false;
            mat.opacity = 0;
          }
        } else {
          // Random chance to spawn
          if (Math.random() < 0.008) {
            spawnShootingStar(star);
          }
        }
      });

      // 5. Smooth Camera Damping (Inertia Parallax)
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.position.z += (targetCameraZ - camera.position.z) * 0.04;
      camera.lookAt(0, -10, 0);

      solarSystemGroup.rotation.y += (targetSceneRotY - solarSystemGroup.rotation.y) * 0.03;
      solarSystemGroup.rotation.x += (0.28 + targetSceneRotX - solarSystemGroup.rotation.x) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    // ── 12. Cleanup ────────────────────────────────────────────────
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Three.js resources
      galaxyGeometry.dispose();
      galaxyMaterial.dispose();
      starfieldGeo.dispose();
      starfieldMat.dispose();
      sunGeo.dispose();
      sunMat.dispose();
      renderer.dispose();
    };
  }, [interactive, showOrbits, speed, isPaused]);

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
        pointerEvents: interactive ? 'auto' : 'none',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #0B0F29 0%, #030712 100%)',
      }}
    />
  );
};

export default MilkyWay3DCanvas;
