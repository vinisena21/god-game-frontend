import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sky, Cloud, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { Agent, Structure, Entity, DivineState, MapMode } from './types';
import { ElementalParticles, RainParticles } from './Particles';
import { InstancedEntities } from './InstancedWorld';

function to3D(x: number, y: number): [number, number, number] {
  return [(x - 50) * 0.6, 0, (y - 50) * 0.6];
}

function from3D(px: number, pz: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(100, Math.round(px / 0.6 + 50))),
    y: Math.max(0, Math.min(100, Math.round(pz / 0.6 + 50))),
  };
}

function Island() {
  const geo = useMemo(() => new THREE.CircleGeometry(38, 48), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0c4a6e" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} geometry={geo}>
        <meshStandardMaterial color="#4d7c0f" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[32, 38, 48]} />
        <meshStandardMaterial color="#ca8a04" roughness={1} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0.15]}>
        <planeGeometry args={[4, 55]} />
        <meshStandardMaterial color="#0284c7" transparent opacity={0.75} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ClickPlane({ onGroundClick }: { onGroundClick: (x: number, y: number) => void }) {
  const handle = useCallback(
    (e: { stopPropagation: () => void; point: { x: number; z: number } }) => {
      e.stopPropagation();
      const { x, y } = from3D(e.point.x, e.point.z);
      onGroundClick(x, y);
    },
    [onGroundClick]
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} onClick={handle}>
      <circleGeometry args={[38, 48]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

/** Agentes ficam individuais (Text + HP bar únicos) */
function Agent3D({ agent, selected }: { agent: Agent; selected: boolean }) {
  const [px, , pz] = to3D(agent.x, agent.y);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 2.5 + agent.id) * 0.05;
  });
  const bodyColor = agent.hp < 30 ? '#ef4444' : '#f1f5f9';
  return (
    <group ref={ref} position={[px, 0, pz]}>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.55, 0.7, 16]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.22, 0.4, 3, 6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#fde68a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.12, 6]} />
        <meshStandardMaterial color="#0ea5e9" />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <planeGeometry args={[0.7, 0.08]} />
        <meshBasicMaterial color="#7f1d1d" />
      </mesh>
      <mesh position={[-(0.7 * (1 - agent.hp / 100)) / 2, 1.7, 0.01]}>
        <planeGeometry args={[0.7 * (agent.hp / 100), 0.08]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      <Text position={[0, 1.95, 0]} fontSize={0.28} color="#4ade80" anchorX="center" outlineWidth={0.015} outlineColor="#000">
        {agent.name}
      </Text>
      {agent.society && agent.society !== 'Nenhuma' && (
        <Text position={[0, 2.2, 0]} fontSize={0.18} color="#c084fc" anchorX="center" outlineWidth={0.01} outlineColor="#000">
          {agent.society}
        </Text>
      )}
    </group>
  );
}

/** Labels de casas (poucos — Text não instancia bem) */
function HouseLabels({ structures }: { structures: Structure[] }) {
  return (
    <>
      {structures.slice(0, 40).map((s, i) => {
        const [px, , pz] = to3D(s.x, s.y);
        return (
          <Text
            key={`hl-${s.id ?? i}`}
            position={[px, 2.1, pz]}
            fontSize={0.35}
            color="#fff"
            anchorX="center"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {s.agent_name}
          </Text>
        );
      })}
    </>
  );
}

function ElementalFX({ divine }: { divine: DivineState | null }) {
  const lc = divine?.lastCast;
  if (!lc) return null;
  const [px, , pz] = to3D(lc.x, lc.y);
  const colors: Record<string, string> = {
    FOGO: '#ef4444', AGUA: '#3b82f6', TERRA: '#a16207', AR: '#94a3b8', VIDA: '#22c55e',
  };
  const r = (lc.radius || 8) * 0.6;
  return (
    <>
      <Float speed={2} floatIntensity={0.3}>
        <mesh position={[px, 0.3, pz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r * 0.7, r, 24]} />
          <meshBasicMaterial color={colors[lc.element] || '#fff'} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </Float>
      <ElementalParticles divine={divine} />
    </>
  );
}

function WeatherFX({ weather }: { weather: string }) {
  const w = (weather || '').toLowerCase();
  const sunPos: [number, number, number] = w.includes('tempestade')
    ? [5, 4, -10]
    : w.includes('nublado')
      ? [20, 8, 10]
      : [40, 20, 30];
  const raining = w.includes('chuva') || w.includes('tempestade');
  const heavy = w.includes('tempestade');

  return (
    <>
      <Sky sunPosition={sunPos} turbidity={heavy ? 10 : 3} rayleigh={raining ? 1 : 2} />
      {(w.includes('nublado') || raining) && (
        <>
          <Cloud position={[-10, 12, -5]} speed={0.2} opacity={0.5} segments={12} />
          <Cloud position={[8, 14, 4]} speed={0.15} opacity={0.4} segments={10} />
        </>
      )}
      <RainParticles active={raining} heavy={heavy} />
      <ambientLight intensity={heavy ? 0.35 : 0.65} />
      <directionalLight position={sunPos} intensity={heavy ? 0.5 : 1.1} />
    </>
  );
}

interface World3DProps {
  agents: Agent[];
  structures: Structure[];
  entities: Entity[];
  weather: string;
  divine: DivineState | null;
  selectedAgentId: number | null;
  mapMode: MapMode;
  onGroundClick: (x: number, y: number) => void;
  onAgentClick: (agent: Agent) => void;
}

function Scene(props: World3DProps) {
  const { agents, structures, entities, weather, divine, selectedAgentId, onGroundClick, onAgentClick } = props;

  return (
    <>
      <WeatherFX weather={weather} />
      <Island />
      <ClickPlane onGroundClick={onGroundClick} />

      {/* 1–3 draw calls por tipo em vez de N meshes */}
      <InstancedEntities entities={entities} structures={structures} />
      <HouseLabels structures={structures} />

      {agents
        .filter((a) => a.hp > 0)
        .map((a) => (
          <group
            key={`a-${a.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onAgentClick(a);
            }}
          >
            <Agent3D agent={a} selected={selectedAgentId === a.id} />
          </group>
        ))}

      <ElementalFX divine={divine} />
      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2.1}
        minDistance={15}
        maxDistance={70}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

export default function World3D(props: World3DProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 960,
        height: 520,
        borderRadius: 16,
        overflow: 'hidden',
        border: '3px solid #1e293b',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        background: '#0f172a',
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop="always"
        camera={{ position: [25, 22, 25], fov: 45, near: 0.5, far: 200 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
        }}
        style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
      >
        <color attach="background" args={['#0f172a']} />
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
