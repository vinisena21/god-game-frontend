/**
 * Partículas com shaders WebGL otimizados.
 * - ShaderMaterial criado 1x (useMemo)
 * - drawRange só nas partículas vivas
 * - sem THREE.Color por frame
 * - physics early-out + compactação in-place
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DivineState, ElementType } from './types';
import { PARTICLE_VERT, PARTICLE_FRAG, RAIN_VERT, RAIN_FRAG } from './shaders';

function to3D(x: number, y: number): THREE.Vector3 {
  return new THREE.Vector3((x - 50) * 0.6, 0.2, (y - 50) * 0.6);
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
}

interface EmitterConfig {
  count: number;
  color: THREE.Color;
  colorEnd?: THREE.Color;
  gravity: number;
  drag: number;
  lift: number;
  spread: number;
  speed: number;
  life: number;
  size: number;
  sizeEnd?: number;
  radial?: number;
}

const ELEMENT_CFG: Record<ElementType, EmitterConfig> = {
  FOGO: {
    count: 70,
    color: new THREE.Color('#ff6b00'),
    colorEnd: new THREE.Color('#fbbf24'),
    gravity: -1.2,
    drag: 0.98,
    lift: 4.5,
    spread: 2.2,
    speed: 3.5,
    life: 1.0,
    size: 0.32,
    sizeEnd: 0.05,
    radial: 1.5,
  },
  AGUA: {
    count: 60,
    color: new THREE.Color('#38bdf8'),
    colorEnd: new THREE.Color('#e0f2fe'),
    gravity: 6,
    drag: 0.99,
    lift: 2,
    spread: 3,
    speed: 2.5,
    life: 1.1,
    size: 0.2,
    sizeEnd: 0.06,
    radial: 2,
  },
  TERRA: {
    count: 50,
    color: new THREE.Color('#a16207'),
    colorEnd: new THREE.Color('#78716c'),
    gravity: 12,
    drag: 0.96,
    lift: 5,
    spread: 2.5,
    speed: 4,
    life: 0.9,
    size: 0.35,
    sizeEnd: 0.12,
    radial: 3.5,
  },
  AR: {
    count: 80,
    color: new THREE.Color('#e2e8f0'),
    colorEnd: new THREE.Color('#94a3b8'),
    gravity: -0.3,
    drag: 0.97,
    lift: 1,
    spread: 5,
    speed: 6,
    life: 1.2,
    size: 0.25,
    sizeEnd: 0.02,
    radial: 4,
  },
  VIDA: {
    count: 55,
    color: new THREE.Color('#4ade80'),
    colorEnd: new THREE.Color('#bbf7d0'),
    gravity: -0.8,
    drag: 0.985,
    lift: 2.5,
    spread: 2.8,
    speed: 2,
    life: 1.4,
    size: 0.22,
    sizeEnd: 0.04,
    radial: 1.2,
  },
};

function spawnBurst(origin: THREE.Vector3, cfg: EmitterConfig, into: Particle[]): void {
  for (let i = 0; i < cfg.count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.6;
    const spd = cfg.speed * (0.4 + Math.random() * 0.8);
    const radial = (cfg.radial ?? 1) * (0.5 + Math.random());
    into.push({
      x: origin.x + (Math.random() - 0.5) * cfg.spread * 0.3,
      y: origin.y + Math.random() * 0.5,
      z: origin.z + (Math.random() - 0.5) * cfg.spread * 0.3,
      vx: Math.cos(theta) * Math.sin(phi) * spd * radial,
      vy: cfg.lift * (0.5 + Math.random()) + Math.cos(phi) * spd * 0.5,
      vz: Math.sin(theta) * Math.sin(phi) * spd * radial,
      life: cfg.life * (0.6 + Math.random() * 0.5),
      maxLife: cfg.life,
      size: cfg.size * (0.7 + Math.random() * 0.6),
    });
  }
}

function createParticleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {},
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
  });
}

export function ElementalParticles({ divine }: { divine: DivineState | null }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useRef<Particle[]>([]);
  const lastKey = useRef<string>('');
  const cfgRef = useRef<EmitterConfig>(ELEMENT_CFG.FOGO);
  const colorA = useRef({ r: 1, g: 0.42, b: 0 });
  const colorB = useRef({ r: 0.98, g: 0.75, b: 0.14 });

  const material = useMemo(() => createParticleMaterial(), []);

  const { positions, colors, sizes, maxCount } = useMemo(() => {
    const maxCount = 100;
    return {
      maxCount,
      positions: new Float32Array(maxCount * 3),
      colors: new Float32Array(maxCount * 3),
      sizes: new Float32Array(maxCount),
    };
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const lc = divine?.lastCast;
    if (!lc) return;
    const key = `${lc.element}-${lc.x}-${lc.y}-${lc.tick}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    const cfg = ELEMENT_CFG[lc.element] || ELEMENT_CFG.FOGO;
    cfgRef.current = cfg;
    colorA.current = { r: cfg.color.r, g: cfg.color.g, b: cfg.color.b };
    const end = cfg.colorEnd || cfg.color;
    colorB.current = { r: end.r, g: end.g, b: end.b };

    particles.current = [];
    spawnBurst(to3D(lc.x, lc.y), cfg, particles.current);
  }, [divine?.lastCast]);

  useFrame((_, dt) => {
    const list = particles.current;
    if (list.length === 0) {
      const geo = pointsRef.current?.geometry;
      if (geo && geo.drawRange.count !== 0) geo.setDrawRange(0, 0);
      return;
    }

    const cfg = cfgRef.current;
    const dtClamped = Math.min(dt, 0.033);
    const ca = colorA.current;
    const cb = colorB.current;
    const sizeEnd = cfg.sizeEnd ?? cfg.size * 0.2;

    let write = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.vy -= cfg.gravity * dtClamped;
      p.vx *= cfg.drag;
      p.vy *= cfg.drag;
      p.vz *= cfg.drag;
      p.x += p.vx * dtClamped;
      p.y += p.vy * dtClamped;
      p.z += p.vz * dtClamped;

      if (p.y < 0.05) {
        p.y = 0.05;
        p.vy *= -0.25;
        p.vx *= 0.7;
        p.vz *= 0.7;
        p.life -= dtClamped * 0.5;
      }

      p.life -= dtClamped;
      if (p.life > 0) list[write++] = p;
    }
    list.length = write;

    const n = Math.min(write, maxCount);
    for (let i = 0; i < n; i++) {
      const p = list[i];
      const t = 1 - p.life / p.maxLife;
      const inv = 1 - t;
      const fade = p.life * 2 > 1 ? 1 : p.life * 2;

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      colors[i * 3] = (ca.r * inv + cb.r * t) * fade;
      colors[i * 3 + 1] = (ca.g * inv + cb.g * t) * fade;
      colors[i * 3 + 2] = (ca.b * inv + cb.b * t) * fade;

      sizes[i] = p.size * inv + sizeEnd * t;
    }

    const geo = pointsRef.current?.geometry;
    if (geo) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      geo.setDrawRange(0, n);
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
    </points>
  );
}

export function RainParticles({ active, heavy }: { active: boolean; heavy?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = heavy ? 280 : 140;

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSize: { value: heavy ? 0.14 : 0.09 },
        uColor: { value: new THREE.Color(heavy ? '#7dd3fc' : '#bae6fd') },
        uOpacity: { value: heavy ? 0.55 : 0.4 },
      },
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
    });
  }, [heavy]);

  useEffect(() => () => material.dispose(), [material]);

  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 25 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    return positions;
  }, [count]);

  const velocities = useMemo(() => {
    const v = new Float32Array(count);
    for (let i = 0; i < count; i++) v[i] = 14 + Math.random() * 10;
    return v;
  }, [count]);

  useFrame((_, dt) => {
    if (!active) return;
    const dtClamped = Math.min(dt, 0.033);
    const wind = heavy ? 2.5 : 1;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= velocities[i] * dtClamped;
      positions[i * 3] += wind * dtClamped;
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 18 + Math.random() * 10;
        positions[i * 3] = (Math.random() - 0.5) * 70;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      }
    }
    const geo = pointsRef.current?.geometry;
    if (geo) geo.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef} frustumCulled={false} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
    </points>
  );
}

export function LightningParticles({ origin, trigger }: { origin: [number, number, number] | null; trigger: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useRef<Particle[]>([]);
  const lastTrigger = useRef(-1);
  const maxCount = 50;

  const material = useMemo(() => createParticleMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  const positions = useMemo(() => new Float32Array(maxCount * 3), []);
  const colors = useMemo(() => new Float32Array(maxCount * 3), []);
  const sizes = useMemo(() => new Float32Array(maxCount), []);

  useEffect(() => {
    if (!origin || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    particles.current = [];
    for (let i = 0; i < 40; i++) {
      particles.current.push({
        x: origin[0] + (Math.random() - 0.5) * 1.5,
        y: origin[1] + Math.random() * 8,
        z: origin[2] + (Math.random() - 0.5) * 1.5,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 6,
        vz: (Math.random() - 0.5) * 4,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.5,
        size: 0.28,
      });
    }
  }, [origin, trigger]);

  useFrame((_, dt) => {
    const list = particles.current;
    if (list.length === 0) {
      pointsRef.current?.geometry.setDrawRange(0, 0);
      return;
    }
    const dtClamped = Math.min(dt, 0.033);
    let write = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.vy -= 8 * dtClamped;
      p.x += p.vx * dtClamped;
      p.y += p.vy * dtClamped;
      p.z += p.vz * dtClamped;
      p.life -= dtClamped;
      if (p.life > 0) list[write++] = p;
    }
    list.length = write;

    const n = Math.min(write, maxCount);
    for (let i = 0; i < n; i++) {
      const p = list[i];
      const a = p.life * 3 > 1 ? 1 : p.life * 3;
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      colors[i * 3] = 0.7 * a;
      colors[i * 3 + 1] = 0.85 * a;
      colors[i * 3 + 2] = 1.0 * a;
      sizes[i] = p.size;
    }

    const geo = pointsRef.current?.geometry;
    if (geo) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      geo.setDrawRange(0, n);
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
    </points>
  );
}
