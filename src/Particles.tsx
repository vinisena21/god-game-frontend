/**
 * Sistema de partículas com física simples:
 * - posição / velocidade / aceleração (gravidade)
 * - vida (lifetime) + fade
 * - forças por elemento (lift, drag, radial burst)
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DivineState, ElementType } from './types';

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
  /** 0–1 usado para cor */
  heat: number;
}

interface EmitterConfig {
  count: number;
  color: THREE.Color;
  colorEnd?: THREE.Color;
  gravity: number;
  drag: number;
  /** impulso vertical inicial */
  lift: number;
  spread: number;
  speed: number;
  life: number;
  size: number;
  sizeEnd?: number;
  /** força radial (explosão) */
  radial?: number;
  continuous?: boolean;
}

const ELEMENT_CFG: Record<ElementType, EmitterConfig> = {
  FOGO: {
    count: 180,
    color: new THREE.Color('#ff6b00'),
    colorEnd: new THREE.Color('#fbbf24'),
    gravity: -1.2, // sobe (gravidade invertida parcial)
    drag: 0.98,
    lift: 4.5,
    spread: 2.2,
    speed: 3.5,
    life: 1.4,
    size: 0.35,
    sizeEnd: 0.05,
    radial: 1.5,
  },
  AGUA: {
    count: 160,
    color: new THREE.Color('#38bdf8'),
    colorEnd: new THREE.Color('#e0f2fe'),
    gravity: 6,
    drag: 0.99,
    lift: 2,
    spread: 3,
    speed: 2.5,
    life: 1.6,
    size: 0.22,
    sizeEnd: 0.08,
    radial: 2,
  },
  TERRA: {
    count: 120,
    color: new THREE.Color('#a16207'),
    colorEnd: new THREE.Color('#78716c'),
    gravity: 12,
    drag: 0.96,
    lift: 5,
    spread: 2.5,
    speed: 4,
    life: 1.2,
    size: 0.4,
    sizeEnd: 0.15,
    radial: 3.5,
  },
  AR: {
    count: 200,
    color: new THREE.Color('#e2e8f0'),
    colorEnd: new THREE.Color('#94a3b8'),
    gravity: -0.3,
    drag: 0.97,
    lift: 1,
    spread: 5,
    speed: 6,
    life: 1.8,
    size: 0.28,
    sizeEnd: 0.02,
    radial: 4,
  },
  VIDA: {
    count: 140,
    color: new THREE.Color('#4ade80'),
    colorEnd: new THREE.Color('#bbf7d0'),
    gravity: -0.8,
    drag: 0.985,
    lift: 2.5,
    spread: 2.8,
    speed: 2,
    life: 2.2,
    size: 0.25,
    sizeEnd: 0.05,
    radial: 1.2,
  },
};

function spawnBurst(
  origin: THREE.Vector3,
  cfg: EmitterConfig,
  into: Particle[]
): void {
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
      heat: Math.random(),
    });
  }
}

/** Burst elementar ligado a lastCast */
export function ElementalParticles({ divine }: { divine: DivineState | null }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useRef<Particle[]>([]);
  const lastKey = useRef<string>('');
  const cfgRef = useRef<EmitterConfig>(ELEMENT_CFG.FOGO);
  const colorA = useRef(new THREE.Color('#ff6b00'));
  const colorB = useRef(new THREE.Color('#fbbf24'));

  const { positions, colors, sizes, maxCount } = useMemo(() => {
    const maxCount = 220;
    return {
      maxCount,
      positions: new Float32Array(maxCount * 3),
      colors: new Float32Array(maxCount * 3),
      sizes: new Float32Array(maxCount),
    };
  }, []);

  // Novo cast → respawn burst
  useEffect(() => {
    const lc = divine?.lastCast;
    if (!lc) return;
    const key = `${lc.element}-${lc.x}-${lc.y}-${lc.tick}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    const cfg = ELEMENT_CFG[lc.element] || ELEMENT_CFG.FOGO;
    cfgRef.current = cfg;
    colorA.current = cfg.color.clone();
    colorB.current = (cfg.colorEnd || cfg.color).clone();
    particles.current = [];
    spawnBurst(to3D(lc.x, lc.y), cfg, particles.current);
  }, [divine?.lastCast]);

  useFrame((_, dt) => {
    const list = particles.current;
    const cfg = cfgRef.current;
    const dtClamped = Math.min(dt, 0.05);

    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      // Física
      p.vy -= cfg.gravity * dtClamped; // note: gravity positive = down in our convention when gravity>0
      // Wait: we defined FOGO gravity as -1.2 meaning upward bias.
      // Apply as acceleration on vy: p.vy += (-gravity) so positive gravity pulls down.
      // Actually above line uses -= cfg.gravity, so positive gravity decreases vy (down if Y up). Good.
      // Fix: I wrote p.vy -= cfg.gravity - for FOGO gravity=-1.2, -= (-1.2) adds lift. Good.

      p.vx *= cfg.drag;
      p.vy *= cfg.drag;
      p.vz *= cfg.drag;

      p.x += p.vx * dtClamped;
      p.y += p.vy * dtClamped;
      p.z += p.vz * dtClamped;

      // Colisão simples com o chão
      if (p.y < 0.05) {
        p.y = 0.05;
        p.vy *= -0.25; // bounce amortecido
        p.vx *= 0.7;
        p.vz *= 0.7;
        p.life -= dtClamped * 0.5; // morre mais rápido no chão
      }

      p.life -= dtClamped;
      if (p.life <= 0) {
        list.splice(i, 1);
      }
    }

    // Upload GPU buffers
    const pos = positions;
    const col = colors;
    const sz = sizes;
    const tmp = new THREE.Color();
    for (let i = 0; i < maxCount; i++) {
      if (i < list.length) {
        const p = list[i];
        const t = 1 - p.life / p.maxLife;
        pos[i * 3] = p.x;
        pos[i * 3 + 1] = p.y;
        pos[i * 3 + 2] = p.z;
        tmp.copy(colorA.current).lerp(colorB.current, t);
        // fade out
        const alphaFade = Math.min(1, p.life * 2);
        col[i * 3] = tmp.r * alphaFade;
        col[i * 3 + 1] = tmp.g * alphaFade;
        col[i * 3 + 2] = tmp.b * alphaFade;
        const sizeEnd = cfg.sizeEnd ?? cfg.size * 0.2;
        sz[i] = THREE.MathUtils.lerp(p.size, sizeEnd, t);
      } else {
        pos[i * 3 + 1] = -999;
        sz[i] = 0;
      }
    }

    const geo = pointsRef.current?.geometry;
    if (geo) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        vertexShader={/* glsl */ `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (180.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={/* glsl */ `
          varying vec3 vColor;
          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float d = length(uv);
            if (d > 0.5) discard;
            float alpha = smoothstep(0.5, 0.1, d);
            gl_FragColor = vec4(vColor, alpha);
          }
        `}
      />
    </points>
  );
}

/** Chuva contínua com física de queda */
export function RainParticles({ active, heavy }: { active: boolean; heavy?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = heavy ? 1200 : 600;

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 25 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      velocities[i] = 12 + Math.random() * 10;
    }
    return { positions, velocities };
  }, [count]);

  useFrame((_, dt) => {
    if (!active) return;
    const dtClamped = Math.min(dt, 0.05);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= velocities[i] * dtClamped;
      // vento leve
      positions[i * 3] += (heavy ? 2 : 0.8) * dtClamped;
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 20 + Math.random() * 10;
        positions[i * 3] = (Math.random() - 0.5) * 70;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      }
    }
    const geo = pointsRef.current?.geometry;
    if (geo) geo.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={heavy ? '#7dd3fc' : '#bae6fd'}
        size={heavy ? 0.12 : 0.08}
        transparent
        opacity={0.55}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/** Faíscas de raio — burst vertical rápido */
export function LightningParticles({ origin, trigger }: { origin: [number, number, number] | null; trigger: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useRef<Particle[]>([]);
  const lastTrigger = useRef(-1);

  const maxCount = 100;
  const positions = useMemo(() => new Float32Array(maxCount * 3), []);
  const colors = useMemo(() => new Float32Array(maxCount * 3), []);

  useEffect(() => {
    if (!origin || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    particles.current = [];
    for (let i = 0; i < 80; i++) {
      particles.current.push({
        x: origin[0] + (Math.random() - 0.5) * 1.5,
        y: origin[1] + Math.random() * 8,
        z: origin[2] + (Math.random() - 0.5) * 1.5,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 6,
        vz: (Math.random() - 0.5) * 4,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.6,
        size: 0.3,
        heat: 1,
      });
    }
  }, [origin, trigger]);

  useFrame((_, dt) => {
    const list = particles.current;
    const dtClamped = Math.min(dt, 0.05);
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.vy -= 8 * dtClamped;
      p.x += p.vx * dtClamped;
      p.y += p.vy * dtClamped;
      p.z += p.vz * dtClamped;
      p.life -= dtClamped;
      if (p.life <= 0) list.splice(i, 1);
    }
    for (let i = 0; i < maxCount; i++) {
      if (i < list.length) {
        const p = list[i];
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
        const a = Math.min(1, p.life * 3);
        colors[i * 3] = 0.7 * a;
        colors[i * 3 + 1] = 0.85 * a;
        colors[i * 3 + 2] = 1.0 * a;
      } else {
        positions[i * 3 + 1] = -999;
      }
    }
    const geo = pointsRef.current?.geometry;
    if (geo) {
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.35}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
