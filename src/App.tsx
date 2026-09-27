import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  WorldState,
  Agent,
  Structure,
  Entity,
  GameEvent,
  Blessing,
  DivineState,
  MapMode,
} from './types';
import ElementalBar, { ELEMENT_COLORS } from './ElementalBar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function extractAgentName(message: string): string | null {
  const m = message.match(/🙏\s*([^:]+):/);
  return m ? m[1].trim() : null;
}

const BLESSING_TO_ACTION: Record<string, string> = {
  heal: 'BLESS_HEAL',
  food: 'BLESS_FOOD',
  water: 'BLESS_WATER',
  resources: 'BLESS_RESOURCES',
  full: 'BLESS_FULL',
};

export default function App() {
  const [worldState, setWorldState] = useState<WorldState>({ current_tick: 0, weather: 'Sincronizando...' });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [divine, setDivine] = useState<DivineState | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [prayerMessage, setPrayerMessage] = useState('');
  const [sendingBlessing, setSendingBlessing] = useState(false);
  const [divineFeedback, setDivineFeedback] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('RAIO');
  const [assets, setAssets] = useState<Record<string, HTMLImageElement>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const names = ['tree', 'house', 'grass', 'water', 'deer', 'wolf'] as const;
    const files = ['/arvore.png', '/casa.png', '/grama.png', '/agua.png', '/cervo.png', '/lobo.png'];
    const imgs: Record<string, HTMLImageElement> = {};
    Promise.all(
      files.map((src, i) => {
        const img = new Image();
        img.src = src;
        imgs[names[i]] = img;
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      })
    ).then(() => setAssets(imgs));
  }, []);

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('gameState', (data: {
      world: WorldState; agents: Agent[]; structures: Structure[]; entities: Entity[]; events: GameEvent[]; divine?: DivineState;
    }) => {
      setWorldState(data.world ?? { current_tick: 0, weather: 'Desconhecido' });
      setAgents(data.agents ?? []);
      setStructures(data.structures ?? []);
      setEntities(data.entities ?? []);
      setEvents(data.events ?? []);
      if (data.divine) setDivine(data.divine);
    });
    return () => { socket.off('gameState'); socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!divineFeedback) return;
    const t = setTimeout(() => setDivineFeedback(null), 2800);
    return () => clearTimeout(t);
  }, [divineFeedback]);

  const prayers = useMemo(() => events.filter((e) => e.type === 'ORAÇÃO').slice(0, 20), [events]);

  const canUse = (actionKey: string): { ok: boolean; reason?: string } => {
    if (!divine) return { ok: true };
    const cost = divine.costs[actionKey] ?? 0;
    const cd = divine.cooldowns[actionKey] ?? 0;
    if (cd > 0) return { ok: false, reason: `CD ${cd}t` };
    if (divine.energy < cost) return { ok: false, reason: `⚡${cost}` };
    return { ok: true };
  };

  const resetWorld = async () => {
    if (!window.confirm('⚠️ GERAR NOVA ILHA? A civilização recomeçará do zero.')) return;
    setIsChanging(true);
    try {
      await fetch(`${API_URL}/api/world/reset`, { method: 'POST' });
      setSelectedAgent(null);
      setPrayerMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsChanging(false);
    }
  };

  const handleMapClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    const isElement = !['RAIO', 'MILAGRE'].includes(mapMode);
    const actionKey = isElement ? `ELEM_${mapMode}` : mapMode;
    const check = canUse(actionKey);
    if (!check.ok) {
      setDivineFeedback((divine?.cooldowns[actionKey] ?? 0) > 0 ? `${mapMode} em cooldown` : 'Energia divina insuficiente');
      return;
    }
    try {
      const body = isElement ? { element: mapMode, x, y } : { action: mapMode, x, y };
      const res = await fetch(`${API_URL}/api/world/god-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setDivineFeedback(data.error || 'Intervenção bloqueada');
        if (data.divine) setDivine(data.divine);
        return;
      }
      if (data.divine) setDivine(data.divine);
      if (data.summary) setDivineFeedback(`${data.element || mapMode}: ${data.summary} (−${data.cost ?? '?'}⚡)`);
    } catch (error) {
      console.error('Falha ao invocar poder divino:', error);
    }
  }, [divine, mapMode]);

  const sendDivineResponse = async (agentId: number, blessing?: Blessing) => {
    const actionKey = blessing ? BLESSING_TO_ACTION[blessing] : 'BLESS_MESSAGE';
    const check = canUse(actionKey);
    if (!check.ok) {
      setDivineFeedback((divine?.cooldowns[actionKey] ?? 0) > 0 ? `Em cooldown (${divine!.cooldowns[actionKey]} ticks)` : 'Energia divina insuficiente');
      return;
    }
    setSendingBlessing(true);
    try {
      const res = await fetch(`${API_URL}/api/agents/${agentId}/miracle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prayerMessage || undefined, blessing: blessing || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDivineFeedback(data.error || 'Bênção bloqueada');
        if (data.divine) setDivine(data.divine);
        return;
      }
      if (data.divine) setDivine(data.divine);
      setPrayerMessage('');
      setDivineFeedback(`✨ Bênção enviada (−${data.cost ?? '?'} energia)`);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingBlessing(false);
    }
  };

  const selectAgentFromPrayer = (message: string) => {
    const name = extractAgentName(message);
    if (!name) return;
    const agent = agents.find((a) => a.name === name && a.hp > 0);
    if (agent) setSelectedAgent(agent);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const scaleX = width / 100;
    const scaleY = height / 100;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(width * 0.03, height * 0.03, width * 0.94, height * 0.94, 50);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9, 40);
    ctx.clip();

    if (assets.grass?.complete && assets.grass.naturalHeight !== 0) {
      const pattern = ctx.createPattern(assets.grass, 'repeat');
      if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, width, height); }
    } else {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, 0, width, height);
    }

    const w = (worldState.weather || '').toLowerCase();
    if (w.includes('chuva') || w.includes('tempestade')) {
      ctx.fillStyle = 'rgba(30, 58, 138, 0.25)';
      ctx.fillRect(0, 0, width, height);
    } else if (w.includes('nublado')) {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;
    ctx.lineCap = 'round';
    if (assets.water?.complete && assets.water.naturalHeight !== 0) {
      const waterPattern = ctx.createPattern(assets.water, 'repeat');
      if (waterPattern) ctx.strokeStyle = waterPattern;
    } else ctx.strokeStyle = '#0284c7';

    ctx.lineWidth = 6 * scaleX;
    ctx.beginPath();
    ctx.moveTo(40 * scaleX, 0);
    ctx.bezierCurveTo(60 * scaleX, 30 * scaleY, 35 * scaleX, 60 * scaleY, 55 * scaleX, 100 * scaleY);
    ctx.stroke();
    ctx.restore();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 4;

    const drawProportional = (img: HTMLImageElement | undefined, x: number, y: number, baseWidth: number) => {
      if (img && img.complete && img.naturalWidth > 0) {
        const ar = img.naturalHeight / img.naturalWidth;
        const th = baseWidth * ar;
        ctx.drawImage(img, x - baseWidth / 2, y - th + baseWidth * 0.2, baseWidth, th);
        return true;
      }
      return false;
    };

    entities.forEach((e) => {
      const ex = e.x * scaleX, ey = e.y * scaleY;
      if (e.type === 'Árvore Anciã') {
        if (!drawProportional(assets.tree, ex, ey, 55)) {
          ctx.fillStyle = '#451a03'; ctx.fillRect(ex - 3, ey - 5, 6, 12);
          ctx.fillStyle = '#065f46'; ctx.beginPath(); ctx.arc(ex, ey - 10, 10, 0, Math.PI * 2); ctx.fill();
        }
      } else if (e.type === 'Jazida de Ouro') {
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(ex - 2, ey - 2, 3, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === 'Cervo') {
        if (!drawProportional(assets.deer, ex, ey, 24)) {
          ctx.fillStyle = '#d97706'; ctx.fillRect(ex - 6, ey - 4, 12, 8); ctx.fillRect(ex + 4, ey - 8, 5, 5);
        }
      } else if (e.type === 'Lobo') {
        if (!drawProportional(assets.wolf, ex, ey, 24)) {
          ctx.fillStyle = '#334155'; ctx.fillRect(ex - 6, ey - 4, 12, 8); ctx.fillRect(ex + 4, ey - 8, 5, 5);
        }
      }
    });

    structures.forEach((s) => {
      const sx = s.x * scaleX, sy = s.y * scaleY;
      if (s.type === 'Casa') {
        if (!drawProportional(assets.house, sx, sy, 65)) {
          ctx.fillStyle = '#b45309'; ctx.fillRect(sx - 14, sy - 10, 28, 20);
          ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.moveTo(sx - 18, sy - 10); ctx.lineTo(sx, sy - 25); ctx.lineTo(sx + 18, sy - 10); ctx.fill();
        }
      }
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(s.agent_name, sx, sy - 35); ctx.shadowBlur = 6;
    });

    if (divine?.lastCast) {
      const lc = divine.lastCast;
      const cx = lc.x * scaleX, cy = lc.y * scaleY;
      const r = lc.radius * ((scaleX + scaleY) / 2);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = ELEMENT_COLORS[lc.element] || 'rgba(255,255,255,0.2)';
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }

    agents.forEach((a) => {
      if (a.hp <= 0) return;
      const ax = a.x * scaleX, ay = a.y * scaleY;
      const isSelected = selectedAgent?.id === a.id;
      const recentPrayer = events.find((ev) => ev.type === 'ORAÇÃO' && ev.message.includes(a.name) && worldState.current_tick - ev.tick < 6);
      if (recentPrayer) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ax, ay - 2, 18, 0, Math.PI * 2); ctx.stroke();
      }
      if (isSelected) {
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ax, ay - 2, 16, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = a.hp < 30 ? '#ef4444' : '#f8fafc';
      ctx.beginPath(); ctx.arc(ax, ay + 4, 7, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(ax, ay - 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0ea5e9'; ctx.fillRect(ax - 4, ay - 8, 8, 3);
      ctx.shadowBlur = 0;
      if (recentPrayer) {
        ctx.fillStyle = '#fef08a'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('🙏', ax, ay - 28);
      }
      if (a.society && a.society !== 'Nenhuma') {
        ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#c084fc'; ctx.textAlign = 'center'; ctx.fillText(`[${a.society}]`, ax, ay - 24);
      }
      ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.fillText(a.name, ax, ay - 14);
      ctx.fillStyle = '#4ade80'; ctx.fillText(a.name, ax - 1, ay - 15);
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(ax - 12, ay + 12, 24, 4);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(ax - 12, ay + 12, 24 * (a.hp / 100), 4);
      ctx.shadowBlur = 6;
    });
  }, [worldState, agents, structures, entities, assets, events, selectedAgent, divine]);

  const weatherEmoji = (w: string) => {
    const lower = (w || '').toLowerCase();
    if (lower.includes('chuva') || lower.includes('tempestade')) return '🌧️';
    if (lower.includes('nublado')) return '☁️';
    if (lower.includes('sol') || lower.includes('ensolarado')) return '☀️';
    return '🌤️';
  };

  const eventColor = (type: string) => {
    if (['CONFLITO', 'PUNIÇÃO', 'MORTE'].includes(type)) return '#ef4444';
    if (type === 'DIÁLOGO') return '#3b82f6';
    if (type === 'ORAÇÃO') return '#fbbf24';
    if (type === 'RESPOSTA_DIVINA') return '#a78bfa';
    if (type === 'ELEMENTAL') return '#f97316';
    if (['ALIANÇA', 'COMÉRCIO', 'MILAGRE', 'CONSTRUÇÃO', 'CAÇA', 'NASCIMENTO'].includes(type)) return '#4ade80';
    return '#888';
  };

  const btnBase: React.CSSProperties = {
    padding: '0.45rem 0.9rem', color: '#fff', border: '1px solid #444', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', backgroundColor: '#222',
  };

  const blessingBtn = (key: string, style: React.CSSProperties): React.CSSProperties => {
    const check = canUse(key);
    return { ...btnBase, ...style, opacity: check.ok && !sendingBlessing ? 1 : 0.45, cursor: check.ok && !sendingBlessing ? 'pointer' : 'not-allowed' };
  };

  const aliveAgents = agents.filter((a) => a.hp > 0);
  const energyPct = divine ? (divine.energy / divine.maxEnergy) * 100 : 100;
  const energyColor = energyPct > 50 ? '#a78bfa' : energyPct > 25 ? '#fbbf24' : '#ef4444';

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#050505', color: '#e5e5e5', minHeight: '100vh' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', maxWidth: '1280px', margin: '0 auto 1.25rem', backgroundColor: '#111', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #2a2a2a' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '1.35rem', fontWeight: 700 }}>
            👁️ Painel do Criador <span style={{ color: '#4ade80', fontWeight: 500 }}>· Tick {worldState.current_tick}</span>
          </h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.85rem', color: '#aaa', flexWrap: 'wrap' }}>
            <span>{weatherEmoji(worldState.weather)} {worldState.weather || '—'}</span>
            <span style={{ color: connected ? '#4ade80' : '#ef4444' }}>{connected ? '● Online' : '○ Offline'}</span>
            <span>👥 {aliveAgents.length} vivos</span>
            {prayers.length > 0 && <span style={{ color: '#fbbf24' }}>🙏 {prayers.length}</span>}
          </div>
          {divine && (
            <div style={{ marginTop: '0.65rem', maxWidth: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a78bfa', marginBottom: 3 }}>
                <span>⚡ Energia Divina</span>
                <span>{divine.energy}/{divine.maxEnergy} (+{divine.regenPerTick}/tick)</span>
              </div>
              <div style={{ height: 8, backgroundColor: '#1a1a2e', borderRadius: 4, overflow: 'hidden', border: '1px solid #333' }}>
                <div style={{ height: '100%', width: `${energyPct}%`, backgroundColor: energyColor, transition: 'width 0.3s ease', borderRadius: 4 }} />
              </div>
            </div>
          )}
        </div>
        <button disabled={isChanging} onClick={resetWorld} style={{ ...btnBase, backgroundColor: '#7f1d1d', borderColor: '#ef4444', cursor: isChanging ? 'wait' : 'pointer' }}>
          ☄️ Gerar Nova Ilha
        </button>
      </header>

      {divineFeedback && (
        <div style={{ maxWidth: 1280, margin: '0 auto 0.75rem', padding: '0.6rem 1rem', backgroundColor: '#1e1b4b', border: '1px solid #6366f1', borderRadius: 8, color: '#c7d2fe', fontSize: '0.9rem', textAlign: 'center' }}>
          {divineFeedback}
        </div>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
        <canvas
          ref={canvasRef}
          width={900}
          height={600}
          onClick={handleMapClick}
          onContextMenu={(e) => { e.preventDefault(); handleMapClick(e); }}
          style={{ width: '100%', maxWidth: '900px', height: 'auto', backgroundColor: '#000', borderRadius: '16px', border: '3px solid #1e293b', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', cursor: 'crosshair' }}
        />
        <ElementalBar mode={mapMode} onModeChange={setMapMode} divine={divine} canUse={canUse} />
        <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.4rem' }}>
          Clique no mapa para lançar: <b style={{ color: '#c4b5fd' }}>{mapMode}</b>
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', maxWidth: '1280px', margin: '0 auto' }}>
        <section>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.15rem' }}>🙏 Orações</h2>
          <div style={{ backgroundColor: '#111', padding: '0.85rem', borderRadius: '12px', border: '1px solid #3b2f0a', height: 280, overflowY: 'auto' }}>
            {prayers.length === 0 && <p style={{ color: '#666', textAlign: 'center', marginTop: '2rem' }}>Nenhuma oração recente.</p>}
            {prayers.map((ev) => (
              <div key={ev.id} onClick={() => selectAgentFromPrayer(ev.message)} style={{ borderLeft: '3px solid #fbbf24', paddingLeft: 10, paddingBottom: '0.65rem', marginBottom: '0.65rem', borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.72rem', color: '#a80', fontWeight: 600 }}>[Tick {ev.tick}]</span>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.88rem', color: '#fef9c3' }}>{ev.message}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.15rem' }}>📜 Livro das Eras</h2>
          <div style={{ backgroundColor: '#111', padding: '0.85rem', borderRadius: '12px', border: '1px solid #2a2a2a', height: 280, overflowY: 'auto' }}>
            {events.map((ev) => (
              <div key={ev.id} style={{ borderLeft: `3px solid ${eventColor(ev.type)}`, paddingLeft: 10, paddingBottom: '0.65rem', marginBottom: '0.65rem', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: 600 }}>[Tick {ev.tick}] {ev.type}</span>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.88rem', color: '#ddd' }}>{ev.message}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.15rem' }}>🧠 Cidadãos ({aliveAgents.length})</h2>
          {selectedAgent && selectedAgent.hp > 0 && (
            <div style={{ backgroundColor: '#1a1520', border: '1px solid #a78bfa', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#c4b5fd' }}>✨ Responder a {selectedAgent.name}</h3>
                <button onClick={() => setSelectedAgent(null)} style={{ ...btnBase, cursor: 'pointer' }}>Fechar</button>
              </div>
              <p style={{ margin: '0.5rem 0', color: '#aaa', fontStyle: 'italic' }}>"{selectedAgent.action}"</p>
              <textarea value={prayerMessage} onChange={(e) => setPrayerMessage(e.target.value)} placeholder="Mensagem divina..." rows={2}
                style={{ width: '100%', backgroundColor: '#0a0a0a', border: '1px solid #444', borderRadius: 8, color: '#eee', padding: '0.6rem', marginBottom: '0.75rem', fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {([['heal','BLESS_HEAL','❤️ Curar','#14532d','#22c55e'],['food','BLESS_FOOD','🍖 Comida','#713f12','#eab308'],['water','BLESS_WATER','💧 Água','#1e3a5f','#3b82f6'],['resources','BLESS_RESOURCES','🪵 Recursos','#3b0764','#a78bfa'],['full','BLESS_FULL','🌟 Completa','#4c1d95','#c4b5fd']] as const).map(([bless, key, label, bg, border]) => {
                  const cd = divine?.cooldowns[key];
                  const cost = divine?.costs[key];
                  return (
                    <button key={key} disabled={sendingBlessing || !canUse(key).ok} onClick={() => sendDivineResponse(selectedAgent.id, bless)}
                      style={blessingBtn(key, { backgroundColor: bg, borderColor: border })}>
                      {label}{cd ? ` (${cd}t)` : cost != null ? ` −${cost}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            {agents.map((agent) => (
              <div key={agent.id} onClick={() => agent.hp > 0 && setSelectedAgent(agent)}
                style={{ backgroundColor: selectedAgent?.id === agent.id ? '#1a1520' : '#111', padding: '1rem', borderRadius: 12, border: `1px solid ${selectedAgent?.id === agent.id ? '#a78bfa' : '#2a2a2a'}`, opacity: agent.hp <= 0 ? 0.35 : 1, cursor: agent.hp > 0 ? 'pointer' : 'default' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: '#4ade80', fontSize: '1rem' }}>{agent.name} {agent.hp <= 0 && '💀'}</h3>
                <div style={{ display: 'flex', gap: '0.55rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#3b82f6' }}>💧 {agent.water}</span>
                  <span style={{ color: '#eab308' }}>🍖 {agent.food}</span>
                  <span style={{ color: agent.hp < 30 ? '#ef4444' : '#4ade80' }}>❤️ {agent.hp}</span>
                </div>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>"{agent.action}"</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
