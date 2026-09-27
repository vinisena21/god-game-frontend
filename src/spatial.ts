/**
 * Spatial Hash Grid — broadphase barato para colisão/picking.
 */

export interface SpatialItem {
  id: number;
  x: number;
  z: number;
  r: number;
  kind: string;
  instanceId?: number;
}

export class SpatialHash {
  private cellSize: number;
  private inv: number;
  private cells = new Map<number, SpatialItem[]>();
  private items: SpatialItem[] = [];

  constructor(cellSize = 4) {
    this.cellSize = cellSize;
    this.inv = 1 / cellSize;
  }

  clear() {
    this.cells.clear();
    this.items = [];
  }

  private key(cx: number, cz: number): number {
    return ((cx + 512) & 1023) | (((cz + 512) & 1023) << 10);
  }

  private cellOf(x: number, z: number): [number, number] {
    return [Math.floor(x * this.inv), Math.floor(z * this.inv)];
  }

  insert(item: SpatialItem) {
    this.items.push(item);
    const [cx, cz] = this.cellOf(item.x, item.z);
    const cr = Math.ceil(item.r * this.inv);
    for (let dx = -cr; dx <= cr; dx++) {
      for (let dz = -cr; dz <= cr; dz++) {
        const k = this.key(cx + dx, cz + dz);
        let bucket = this.cells.get(k);
        if (!bucket) {
          bucket = [];
          this.cells.set(k, bucket);
        }
        bucket.push(item);
      }
    }
  }

  rebuild(list: SpatialItem[]) {
    this.clear();
    for (let i = 0; i < list.length; i++) this.insert(list[i]);
  }

  queryRadius(x: number, z: number, radius: number): SpatialItem[] {
    const [cx, cz] = this.cellOf(x, z);
    const cr = Math.ceil(radius * this.inv);
    const out: SpatialItem[] = [];
    const seen = new Set<number>();
    for (let dx = -cr; dx <= cr; dx++) {
      for (let dz = -cr; dz <= cr; dz++) {
        const bucket = this.cells.get(this.key(cx + dx, cz + dz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const it = bucket[i];
          if (seen.has(it.id)) continue;
          seen.add(it.id);
          const ddx = it.x - x;
          const ddz = it.z - z;
          const maxR = it.r + radius;
          if (ddx * ddx + ddz * ddz <= maxR * maxR) out.push(it);
        }
      }
    }
    return out;
  }

  queryNearest(x: number, z: number, maxRadius = 2): SpatialItem | null {
    const hits = this.queryRadius(x, z, maxRadius);
    let best: SpatialItem | null = null;
    let bestD = Infinity;
    for (let i = 0; i < hits.length; i++) {
      const it = hits[i];
      const ddx = it.x - x;
      const ddz = it.z - z;
      const d = ddx * ddx + ddz * ddz;
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  resolveCircle(
    x: number,
    z: number,
    radius: number
  ): { x: number; z: number; hit: SpatialItem | null } {
    const hits = this.queryRadius(x, z, radius);
    let ox = x;
    let oz = z;
    let last: SpatialItem | null = null;
    for (let i = 0; i < hits.length; i++) {
      const it = hits[i];
      const ddx = ox - it.x;
      const ddz = oz - it.z;
      const dist = Math.sqrt(ddx * ddx + ddz * ddz) || 0.0001;
      const minDist = radius + it.r;
      if (dist < minDist) {
        const push = (minDist - dist) / dist;
        ox += ddx * push;
        oz += ddz * push;
        last = it;
      }
    }
    return { x: ox, z: oz, hit: last };
  }

  get size() {
    return this.items.length;
  }
}

export const COLLISION_RADIUS: Record<string, number> = {
  'Árvore Anciã': 0.55,
  'Jazida de Ouro': 0.6,
  Cervo: 0.4,
  Lobo: 0.35,
  Urso: 0.55,
  Coelho: 0.2,
  Javali: 0.4,
  Raposa: 0.3,
  Cabra: 0.35,
  Alce: 0.55,
  Águia: 0.35,
  Serpente: 0.25,
  Goblin: 0.4,
  Casa: 0.9,
};

export function worldFromGrid(gx: number, gy: number): { x: number; z: number } {
  return { x: (gx - 50) * 0.6, z: (gy - 50) * 0.6 };
}
