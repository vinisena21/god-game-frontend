/**
 * GPU Instancing + colisão espacial + fauna expandida.
 */
import { useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Entity, Structure } from './types';
import { SpatialHash, COLLISION_RADIUS, worldFromGrid, type SpatialItem } from './spatial';

function to3D(x: number, y: number): { px: number; pz: number } {
  return { px: (x - 50) * 0.6, pz: (y - 50) * 0.6 };
}

const MAX_TREES = 120;
const MAX_ORES = 40;
const MAX_ANIMALS = 120;
const MAX_HOUSES = 40;

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

const NO_RAYCAST = () => {};

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

function disableRaycast(mesh: THREE.InstancedMesh | null) {
  if (mesh) mesh.raycast = NO_RAYCAST;
}

export const worldSpatial = new SpatialHash(3.5);

export function rebuildSpatial(entities: Entity[], structures: Structure[]) {
  const items: SpatialItem[] = [];
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const { x, z } = worldFromGrid(e.x, e.y);
    items.push({
      id: e.id,
      x,
      z,
      r: COLLISION_RADIUS[e.type] ?? 0.4,
      kind: e.type,
    });
  }
  for (let i = 0; i < structures.length; i++) {
    const s = structures[i];
    const { x, z } = worldFromGrid(s.x, s.y);
    items.push({
      id: -(s.id ?? i + 1),
      x,
      z,
      r: COLLISION_RADIUS.Casa,
      kind: 'Casa',
    });
  }
  worldSpatial.rebuild(items);
}

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
        disableRaycast(ref.current);
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
        disableRaycast(ref.current);
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

const ANIMAL_META: Record<string, { color: string; scale: number; fly?: boolean }> = {
  Cervo: { color: '#b45309', scale: 0.9 },
  Lobo: { color: '#475569', scale: 0.85 },
  Urso: { color: '#78350f', scale: 1.35 },
  Coelho: { color: '#e7e5e4', scale: 0.45 },
  Javali: { color: '#44403c', scale: 0.95 },
  Raposa: { color: '#ea580c', scale: 0.7 },
  Cabra: { color: '#d6d3d1', scale: 0.75 },
  Alce: { color: '#92400e', scale: 1.25 },
  Águia: { color: '#78716c', scale: 0.55, fly: true },
  Serpente: { color: '#4d7c0f', scale: 0.5 },
  Goblin: { color: '#3f6212', scale: 0.8 },
};

export function InstancedAnimals({ entities }: { entities: Entity[] }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);

  const animals = useMemo(
    () => entities.filter((e) => ANIMAL_META[e.type]).slice(0, MAX_ANIMALS),
    [entities]
  );

  const bases = useMemo(
    () =>
      animals.map((a) => {
        const { px, pz } = to3D(a.x, a.y);
        const meta = ANIMAL_META[a.type];
        return {
          px,
          pz,
          scale: meta.scale,
          color: meta.color,
          seed: a.x + a.y * 0.17,
          fly: !!meta.fly,
        };
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
      disableRaycast(bodyRef.current);
    }
    if (headRef.current) {
      if (headRef.current.instanceColor) headRef.current.instanceColor.needsUpdate = true;
      headRef.current.count = n;
      disableRaycast(headRef.current);
    }
  }, [bases]);

  useFrame(({ clock }) => {
    const n = bases.length;
    if (n === 0) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const b = bases[i];
      const bob = Math.sin(t * 3 + b.seed) * 0.04;
      const flyY = b.fly ? 1.8 + Math.sin(t * 2 + b.seed) * 0.35 : 0;
      const s = b.scale;
      writeMatrix(bodyRef.current, i, b.px, 0.35 * s + bob + flyY, b.pz, s, s, s);
      writeMatrix(headRef.current, i, b.px + 0.28 * s, 0.6 * s + bob + flyY, b.pz, s, s, s);
    }
    if (bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;
    if (headRef.current) headRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geos.body, mats.body, MAX_ANIMALS]} frustumCulled={false} />
      <instancedMesh ref={headRef} args={[geos.head, mats.head, MAX_ANIMALS]} frustumCulled={false} />
    </>
  );
}

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
        disableRaycast(ref.current);
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

export function CollisionDebug({ debug = false }: { debug?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 4), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#22d3ee',
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      }),
    []
  );
  useFrame(() => {
    if (!debug || !ref.current) return;
    const hits = worldSpatial.queryRadius(0, 0, 50);
    const n = Math.min(hits.length, 200);
    for (let i = 0; i < n; i++) {
      const it = hits[i];
      writeMatrix(ref.current, i, it.x, it.r, it.z, it.r, it.r, it.r);
    }
    ref.current.count = n;
    ref.current.instanceMatrix.needsUpdate = true;
    disableRaycast(ref.current);
  });
  if (!debug) return null;
  return <instancedMesh ref={ref} args={[geo, mat, 200]} frustumCulled={false} />;
}

export function InstancedEntities({
  entities,
  structures,
  debugCollision = false,
}: {
  entities: Entity[];
  structures: Structure[];
  debugCollision?: boolean;
}) {
  useEffect(() => {
    rebuildSpatial(entities, structures);
  }, [entities, structures]);

  return (
    <>
      <InstancedTrees entities={entities} />
      <InstancedOres entities={entities} />
      <InstancedAnimals entities={entities} />
      <InstancedHouses structures={structures} />
      <CollisionDebug debug={debugCollision} />
    </>
  );
}
