import { useRef, useMemo, useCallback } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sky, Cloud, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { Agent, Structure, Entity, DivineState, MapMode } from './types';
import { ElementalParticles, RainParticles } from './Particles';

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
  const geo = useMemo(() => new THREE.CircleGeometry(38, 64), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0c4a6e" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow geometry={geo}>
        <meshStandardMaterial color="#4d7c0f" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[32, 38, 64]} />
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
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const { x, y } = from3D(e.point.x, e.point.z);
      onGroundClick(x, y);
    },
    [onGroundClick]
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} onClick={handle}>
      <circleGeometry args={[38, 64]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function Tree3D({ x, y }: { x: number; y: number }) {
  const [px, , pz] = to3D(x, y);
  const h = 1.8 + ((x * 7 + y * 3) % 10) * 0.12;
  return (
    <group position={[px, 0, pz]}>
      <mesh position={[0, h * 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, h * 0.7, 6]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.95} />
      </mesh>
      <mesh position={[0, h * 0.85, 0]} castShadow>
        <coneGeometry args={[0.9, h * 0.9, 7]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
      <mesh position={[0, h * 1.25, 0]} castShadow>
        <coneGeometry args={[0.6, h * 0.55, 7]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Ore3D({ x, y }: { x: number; y: number }) {
  const [px, , pz] = to3D(x, y);
  return (
    <group position={[px, 0.2, pz]}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#78716c" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0.2, 0.25, 0.1]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.4} metalness={0.8} />
      </mesh>
    </group>
  );
}

function AnimalBody({
  x,
  y,
  bodyColor,
  scale = 1,
  ears = false,
  horns = false,
  tall = false,
}: {
  x: number;
  y: number;
  bodyColor: string;
  scale?: number;
  ears?: boolean;
  horns?: boolean;
  tall?: boolean;
}) {
  const [px, , pz] = to3D(x, y);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 3 + x) * 0.04;
  });
  const bh = tall ? 0.55 : 0.35;
  return (
    <group ref={ref} position={[px, 0, pz]} scale={scale}>
      <mesh position={[0, bh, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.35, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.85} />
      </mesh>
      <mesh position={[0.28, bh + 0.25, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.85} />
      </mesh>
      {ears && (
        <>
          <mesh position={[0.3, bh + 0.45, 0.12]}>
            <coneGeometry args={[0.06, 0.18, 4]} />
            <meshStandardMaterial color={bodyColor} />
          </mesh>
          <mesh position={[0.3, bh + 0.45, -0.12]}>
            <coneGeometry args={[0.06, 0.18, 4]} />
            <meshStandardMaterial color={bodyColor} />
          </mesh>
        </>
      )}
      {horns && (
        <>
          <mesh position={[0.25, bh + 0.5, 0.1]} rotation={[0, 0, 0.4]}>
            <cylinderGeometry args={[0.02, 0.03, 0.3, 4]} />
            <meshStandardMaterial color="#a8a29e" />
          </mesh>
          <mesh position={[0.25, bh + 0.5, -0.1]} rotation={[0, 0, -0.4]}>
            <cylinderGeometry args={[0.02, 0.03, 0.3, 4]} />
            <meshStandardMaterial color="#a8a29e" />
          </mesh>
        </>
      )}
      {[[-0.12, -0.15], [-0.12, 0.15], [0.12, -0.15], [0.12, 0.15]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.12, lz]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.25, 5]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      ))}
    </group>
  );
}

function EntityMesh({ entity }: { entity: Entity }) {
  switch (entity.type) {
    case 'Árvore Anciã':
      return <Tree3D x={entity.x} y={entity.y} />;
    case 'Jazida de Ouro':
      return <Ore3D x={entity.x} y={entity.y} />;
    case 'Cervo':
      return <AnimalBody x={entity.x} y={entity.y} bodyColor="#b45309" horns scale={0.9} />;
    case 'Lobo':
      return <AnimalBody x={entity.x} y={entity.y} bodyColor="#475569" ears scale={0.85} />;
    case 'Urso':
      return <AnimalBody x={entity.x} y={entity.y} bodyColor="#78350f" scale={1.35} />;
    case 'Coelho':
      return <AnimalBody x={entity.x} y={entity.y} bodyColor="#e7e5e4" ears scale={0.45} />;
    case 'Javali':
      return <AnimalBody x={entity.x} y={entity.y} bodyColor="#44403c" scale={0.95} />;
    case 'Raposa':
      return <AnimalBody x={entity.x} y={entity.y} bodyColor="#ea580c" ears scale={0.7} />;
    default:
      return (
        <mesh position={to3D(entity.x, entity.y)}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#a78bfa" />
        </mesh>
      );
  }
}

function House3D({ structure }: { structure: Structure }) {
  const [px, , pz] = to3D(structure.x, structure.y);
  return (
    <group position={[px, 0, pz]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.4, 1.1, 1.4]} />
        <meshStandardMaterial color="#a16207" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.2, 0.9, 4]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.45, 0.71]}>
        <boxGeometry args={[0.35, 0.55, 0.08]} />
        <meshStandardMaterial color="#44403c" />
      </mesh>
      <Text position={[0, 2.1, 0]} fontSize={0.35} color="#fff" anchorX="center" outlineWidth={0.02} outlineColor="#000">
        {structure.agent_name}
      </Text>
    </group>
  );
}

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
          <ringGeometry args={[0.55, 0.7, 24]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.4, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial color="#fde68a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.12, 8]} />
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

/** Anel de área + partículas do elemento */
function ElementalFX({ divine }: { divine: DivineState | null }) {
  const lc = divine?.lastCast;
  if (!lc) return null;
  const [px, , pz] = to3D(lc.x, lc.y);
  const colors: Record<string, string> = {
    FOGO: '#ef4444',
    AGUA: '#3b82f6',
    TERRA: '#a16207',
    AR: '#94a3b8',
    VIDA: '#22c55e',
  };
  const r = (lc.radius || 8) * 0.6;
  return (
    <>
      <Float speed={2} floatIntensity={0.3}>
        <mesh position={[px, 0.3, pz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r * 0.7, r, 32]} />
          <meshBasicMaterial
            color={colors[lc.element] || '#fff'}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
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
      <Sky
        sunPosition={sunPos}
        turbidity={heavy ? 12 : 4}
        rayleigh={raining ? 1 : 2}
      />
      {(w.includes('nublado') || raining) && (
        <>
          <Cloud position={[-10, 12, -5]} speed={0.2} opacity={0.6} segments={20} />
          <Cloud position={[8, 14, 4]} speed={0.15} opacity={0.5} segments={16} />
          <Cloud position={[0, 13, 10]} speed={0.25} opacity={0.55} segments={18} />
        </>
      )}
      <RainParticles active={raining} heavy={heavy} />
      <ambientLight intensity={heavy ? 0.25 : 0.55} />
      <directionalLight
        castShadow
        position={sunPos}
        intensity={heavy ? 0.4 : 1.2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
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

      {entities.map((e) => (
        <EntityMesh key={`e-${e.id}`} entity={e} />
      ))}
      {structures.map((s, i) => (
        <House3D key={`s-${s.id ?? i}`} structure={s} />
      ))}
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
        shadows
        camera={{ position: [25, 22, 25], fov: 45 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
