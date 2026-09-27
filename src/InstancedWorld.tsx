/**
 * GPU Instancing — 1 draw call por tipo de mesh.
 *
 * Técnica: THREE.InstancedMesh + setMatrixAt / setColorAt.
 * Atualiza só matrices quando a lista de entidades muda (ou a cada frame
 * para bobbing leve da fauna).
 */
import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Entity, Structure } from './types';

function to3D(x: number, y: number): { px: number; pz: number } {
  return { px: (x - 50) * 0.6, pz: (y - 50) * 0.6 };
}

const MAX_TREES = 120;
const MAX_ORES = 40;
const MAX_ANIMALS = 80;
const MAX_HOUSES = 40;

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function writeMatrix(
  mesh: THREE.InstancedMesh | null,
  i: number,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
  rotY = 0
) {
  if (!mesh) return;
  _p.set(x, y, z);
  _q.setFromAxisAngle(_s.set(0, 1, 0), rotY);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m);
}

/* ───────── ÁRVORES (tronco + 2 copas) ───────── */

export function InstancedTrees({ entities }: { entities: Entity[] }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const topRef = useRef<THREE.InstancedMesh>(null);

  const trees = useMemo(
    () => entities.filter((e) => e.type === 'Árvore Anciã').slice(0, MAX_TREES),
    [entities]
  );

  const geos = useMemo(
    () => ({
      trunk: new THREE.CylinderGeometry(0.12, 0.18, 1, 5),
      crown: new THREE.ConeGeometry(0.9, 1, 6),
      top: new THREE.ConeGeometry(0.55, 0.7, 6),
    }),
    []
  );

  const mats = useMemo(
    () => ({
      trunk: new THREE.MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.95 }),
      crown: new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.8 }),
      top: new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 }),
    }),
    []
  );

  useLayoutEffect(() => {
    const n = trees.length;
    for (let i = 0; i < n; i++) {
      const t = trees[i];
      const { px, pz } = to3D(t.x, t.y);
      const h = 1.8 + ((t.x * 7 + t.y * 3) % 10) * 0.12;
      writeMatrix(trunkRef.current, i, px, h * 0.35, pz, 1, h * 0.7, 1);
      writeMatrix(crownRef.current, i, px, h * 0.85, pz, 1, h * 0.9, 1);
      writeMatrix(topRef.current, i, px, h * 1.25, pz, 1, h * 0.7, 1);
    }
    for (const ref of [trunkRef, crownRef, topRef]) {
      if (ref.current) {
        ref.current.count = n;
        ref.current.instanceMatrix.needsUpdate = true;
      }
    }
  }, [trees]);

  return (
    <>
      <instancedMesh ref={trunkRef} args={[geos.trunk, mats.trunk, MAX_TREES]} frustumCulled={false} />
      <instancedMesh ref={crownRef} args={[geos.crown, mats.crown, MAX_TREES]} frustumCulled={false} />
      <instancedMesh ref={topRef} args={[geos.top, mats.top, MAX_TREES]} frustumCulled={false} />
    </>
  );
}

/* ───────── MINÉRIO ───────── */

export function InstancedOres({ entities }: { entities: Entity[] }) {
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const gemRef = useRef<THREE.InstancedMesh>(null);

  const ores = useMemo(
    () => entities.filter((e) => e.type === 'Jazida de Ouro').slice(0, MAX_ORES),
    [entities]
  );

  const geos = useMemo(
    () => ({
      rock: new THREE.DodecahedronGeometry(0.55, 0),
      gem: new THREE.OctahedronGeometry(0.22, 0),
    }),
    []
  );

  const mats = useMemo(
    () => ({
      rock: new THREE.MeshStandardMaterial({ color: '#78716c', roughness: 0.6, metalness: 0.4 }),
      gem: new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#f59e0b',
        emissiveIntensity: 0.4,
        metalness: 0.8,
      }),
    }),
    []
  );

  useLayoutEffect(() => {
    const n = ores.length;
    for (let i = 0; i < n; i++) {
      const o = ores[i];
      const { px, pz } = to3D(o.x, o.y);
      writeMatrix(rockRef.current, i, px, 0.2, pz);
      writeMatrix(gemRef.current, i, px + 0.2, 0.45, pz + 0.1);
    }
    for (const ref of [rockRef, gemRef]) {
      if (ref.current) {
        ref.current.count = n;
        ref.current.instanceMatrix.needsUpdate = true;
      }
    }
  }, [ores]);

  return (
    <>
      <instancedMesh ref={rockRef} args={[geos.rock, mats.rock, MAX_ORES]} frustumCulled={false} />
      <instancedMesh ref={gemRef} args={[geos.gem, mats.gem, MAX_ORES]} frustumCulled={false} />
    </>
  );
}

/* ───────── FAUNA (1 mesh + instanceColor) ───────── */

const ANIMAL_META: Record<
  string,
  { color: string; scale: number }
> = {
  Cervo: { color: '#b45309', scale: 0.9 },
  Lobo: { color: '#475569', scale: 0.85 },
  Urso: { color: '#78350f', scale: 1.35 },
  Coelho: { color: '#e7e5e4', scale: 0.45 },
  Javali: { color: '#44403c', scale: 0.95 },
  Raposa: { color: '#ea580c', scale: 0.7 },
};

export function InstancedAnimals({ entities }: { entities: Entity[] }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);

  const animals = useMemo(
    () =>
      entities
        .filter((e) => ANIMAL_META[e.type])
        .slice(0, MAX_ANIMALS),
    [entities]
  );

  // snapshot estável para bobbing (posições base)
  const bases = useMemo(
    () =>
      animals.map((a) => {
        const { px, pz } = to3D(a.x, a.y);
        const meta = ANIMAL_META[a.type];
        return { px, pz, scale: meta.scale, color: meta.color, seed: a.x + a.y * 0.17 };
      }),
    [animals]
  );

  const geos = useMemo(
    () => ({
      body: new THREE.CapsuleGeometry(0.25, 0.35, 3, 6),
      head: new THREE.SphereGeometry(0.2, 6, 6),
    }),
    []
  );

  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
      head: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    }),
    []
  );

  // cores por instância
  useLayoutEffect(() => {
    const n = bases.length;
    for (let i = 0; i < n; i++) {
      _c.set(bases[i].color);
      bodyRef.current?.setColorAt(i, _c);
      headRef.current?.setColorAt(i, _c);
    }
    if (bodyRef.current) {
      if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
      bodyRef.current.count = n;
    }
    if (headRef.current) {
      if (headRef.current.instanceColor) headRef.current.instanceColor.needsUpdate = true;
      headRef.current.count = n;
    }
  }, [bases]);

  // bobbing leve no GPU matrix (1 update/frame para N animais)
  useFrame(({ clock }) => {
    const n = bases.length;
    if (n === 0) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const b = bases[i];
      const bob = Math.sin(t * 3 + b.seed) * 0.04;
      const s = b.scale;
      writeMatrix(bodyRef.current, i, b.px, 0.35 * s + bob, b.pz, s, s, s);
      writeMatrix(headRef.current, i, b.px + 0.28 * s, 0.6 * s + bob, b.pz, s, s, s);
    }
    if (bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;
    if (headRef.current) headRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={bodyRef}
        args={[geos.body, mats.body, MAX_ANIMALS]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={headRef}
        args={[geos.head, mats.head, MAX_ANIMALS]}
        frustumCulled={false}
      />
    </>
  );
}

/* ───────── CASAS (corpo + telhado) ───────── */

export function InstancedHouses({ structures }: { structures: Structure[] }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);

  const houses = useMemo(() => structures.slice(0, MAX_HOUSES), [structures]);

  const geos = useMemo(
    () => ({
      body: new THREE.BoxGeometry(1.4, 1.1, 1.4),
      roof: new THREE.ConeGeometry(1.2, 0.9, 4),
    }),
    []
  );

  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: '#a16207', roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.85 }),
    }),
    []
  );

  useLayoutEffect(() => {
    const n = houses.length;
    for (let i = 0; i < n; i++) {
      const h = houses[i];
      const { px, pz } = to3D(h.x, h.y);
      writeMatrix(bodyRef.current, i, px, 0.55, pz);
      writeMatrix(roofRef.current, i, px, 1.35, pz, 1, 1, 1, Math.PI / 4);
    }
    for (const ref of [bodyRef, roofRef]) {
      if (ref.current) {
        ref.current.count = n;
        ref.current.instanceMatrix.needsUpdate = true;
      }
    }
  }, [houses]);

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geos.body, mats.body, MAX_HOUSES]} frustumCulled={false} />
      <instancedMesh ref={roofRef} args={[geos.roof, mats.roof, MAX_HOUSES]} frustumCulled={false} />
    </>
  );
}

/** Agrupa toda a fauna/flora instanciada */
export function InstancedEntities({ entities, structures }: { entities: Entity[]; structures: Structure[] }) {
  return (
    <>
      <InstancedTrees entities={entities} />
      <InstancedOres entities={entities} />
      <InstancedAnimals entities={entities} />
      <InstancedHouses structures={structures} />
    </>
  );
}
