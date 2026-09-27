import type { CSSProperties } from 'react';
import type { DivineState, ElementType, MapMode } from './types';

const ELEMENTS: {
  id: ElementType;
  emoji: string;
  label: string;
  color: string;
  desc: string;
}[] = [
  { id: 'FOGO', emoji: '🔥', label: 'Fogo', color: '#ef4444', desc: 'Queima área, destrói árvores e casas' },
  { id: 'AGUA', emoji: '💧', label: 'Água', color: '#3b82f6', desc: 'Hidrata, cura leve, pode trazer chuva' },
  { id: 'TERRA', emoji: '🪨', label: 'Terra', color: '#a16207', desc: 'Ergue jazida de ouro no ponto' },
  { id: 'AR', emoji: '💨', label: 'Ar', color: '#94a3b8', desc: 'Empurra agentes, pode gerar tempestade' },
  { id: 'VIDA', emoji: '🌿', label: 'Vida', color: '#22c55e', desc: 'Brota árvores e revitaliza a área' },
];

const CLASSIC: { id: MapMode; emoji: string; label: string; color: string; actionKey: string }[] = [
  { id: 'RAIO', emoji: '⚡', label: 'Raio', color: '#f59e0b', actionKey: 'RAIO' },
  { id: 'MILAGRE', emoji: '✨', label: 'Árvore', color: '#4ade80', actionKey: 'MILAGRE' },
];

interface Props {
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
  divine: DivineState | null;
  canUse: (key: string) => { ok: boolean };
}

export default function ElementalBar({ mode, onModeChange, divine, canUse }: Props) {
  const btn = (active: boolean, color: string, disabled: boolean): CSSProperties => ({
    padding: '0.4rem 0.75rem',
    borderRadius: 8,
    border: `2px solid ${active ? color : '#333'}`,
    backgroundColor: active ? `${color}22` : '#151515',
    color: active ? color : '#aaa',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  });

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '0.85rem',
        maxWidth: 900,
        width: '100%',
      }}
    >
      <span style={{ fontSize: '0.75rem', color: '#666', marginRight: 4 }}>Modo:</span>

      {CLASSIC.map((c) => {
        const check = canUse(c.actionKey);
        const cd = divine?.cooldowns[c.actionKey];
        const cost = divine?.costs[c.actionKey];
        return (
          <button
            key={c.id}
            type="button"
            disabled={!check.ok && mode !== c.id}
            onClick={() => onModeChange(c.id)}
            title={`${c.label}${cost != null ? ` · custo ${cost}` : ''}${cd ? ` · CD ${cd}t` : ''}`}
            style={btn(mode === c.id, c.color, !check.ok && mode !== c.id)}
          >
            {c.emoji} {c.label}
            {cd ? ` (${cd}t)` : cost != null ? ` −${cost}` : ''}
          </button>
        );
      })}

      <span style={{ width: 1, height: 24, background: '#333', margin: '0 4px' }} />

      {ELEMENTS.map((el) => {
        const key = `ELEM_${el.id}`;
        const check = canUse(key);
        const cd = divine?.cooldowns[key];
        const cost = divine?.costs[key];
        return (
          <button
            key={el.id}
            type="button"
            disabled={!check.ok && mode !== el.id}
            onClick={() => onModeChange(el.id)}
            title={`${el.desc}${cost != null ? ` · custo ${cost}` : ''}${cd ? ` · CD ${cd}t` : ''}`}
            style={btn(mode === el.id, el.color, !check.ok && mode !== el.id)}
          >
            {el.emoji} {el.label}
            {cd ? ` (${cd}t)` : cost != null ? ` −${cost}` : ''}
          </button>
        );
      })}
    </div>
  );
}

export const ELEMENT_COLORS: Record<string, string> = {
  FOGO: 'rgba(239, 68, 68, 0.35)',
  AGUA: 'rgba(59, 130, 246, 0.35)',
  TERRA: 'rgba(161, 98, 7, 0.35)',
  AR: 'rgba(148, 163, 184, 0.35)',
  VIDA: 'rgba(34, 197, 94, 0.35)',
};
