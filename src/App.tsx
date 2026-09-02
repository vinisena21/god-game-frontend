import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export default function App() {
  const [worldState, setWorldState] = useState({ current_tick: 0, weather: 'Carregando...' });
  const [agents, setAgents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isChanging, setIsChanging] = useState(false);
  
  // 🖼️ ESTADO PARA GUARDAR AS IMAGENS REAIS
  const [assets, setAssets] = useState<any>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ⚡ PRELOADER DAS IMAGENS DA PASTA PUBLIC
  useEffect(() => {
    const treeImg = new Image();
    treeImg.src = '/arvore.png'; // Procura exatamente esse arquivo na pasta public
    
    const houseImg = new Image();
    houseImg.src = '/casa.png'; // Procura exatamente esse arquivo na pasta public

    Promise.all([
      new Promise(resolve => { treeImg.onload = resolve; treeImg.onerror = resolve; }),
      new Promise(resolve => { houseImg.onload = resolve; houseImg.onerror = resolve; })
    ]).then(() => {
      setAssets({ tree: treeImg, house: houseImg });
      console.log('✅ Assets Gráficos carregados com sucesso!');
    });
  }, []);

  const fetchData = async () => {
    try {
      const worldRes = await fetch(`${API_URL}/api/world`);
      if (worldRes.ok) setWorldState(await worldRes.json());
      const agentsRes = await fetch(`${API_URL}/api/agents`);
      if (agentsRes.ok) setAgents(await agentsRes.json());
      const structRes = await fetch(`${API_URL}/api/world/structures`);
      if (structRes.ok) setStructures(await structRes.json());
      const entRes = await fetch(`${API_URL}/api/world/entities`);
      if (entRes.ok) setEntities(await entRes.json());
      const eventsRes = await fetch(`${API_URL}/api/world/events`);
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch (error) {}
  };

  const resetWorld = async () => {
    if (!window.confirm("⚠️ GERAR NOVA ILHA? A civilização recomeçará do zero.")) return;
    setIsChanging(true);
    await fetch(`${API_URL}/api/world/reset`, { method: 'POST' });
    fetchData(); setIsChanging(false);
  };

  // 🎨 MOTOR GRÁFICO - AGORA COM SUPORTE A SPRITES REAIS (.PNG)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scaleX = width / 100;
    const scaleY = height / 100;

    // Fundo, Areia e Rio (Matemática base mantida)
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fef08a'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(width * 0.03, height * 0.03, width * 0.94, height * 0.94, 50); ctx.fill();

    ctx.save();
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9, 40); ctx.clip();

    for (let x = 0; x < 100; x += 2) {
      for (let y = 0; y < 100; y += 2) {
        ctx.fillStyle = (x + y) % 4 === 0 ? '#10b981' : '#059669'; 
        ctx.fillRect(x * scaleX, y * scaleY, 2 * scaleX, 2 * scaleY);
      }
    }

    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 6 * scaleX; ctx.beginPath(); ctx.moveTo(40 * scaleX, 0); ctx.bezierCurveTo(60 * scaleX, 30 * scaleY, 35 * scaleX, 60 * scaleY, 55 * scaleX, 100 * scaleY); ctx.stroke();
    ctx.lineWidth = 3 * scaleX; ctx.beginPath(); ctx.moveTo(50 * scaleX, 45 * scaleY); ctx.quadraticCurveTo(70 * scaleX, 50 * scaleY, 85 * scaleX, 35 * scaleY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(43 * scaleX, 75 * scaleY); ctx.quadraticCurveTo(20 * scaleX, 80 * scaleY, 15 * scaleX, 95 * scaleY); ctx.stroke();
    ctx.restore(); 

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 4;

    // --- RENDERIZANDO ENTIDADES ---
    entities.forEach(e => {
      const ex = e.x * scaleX; const ey = e.y * scaleY;
      
      if (e.type === 'Árvore Anciã') {
        // ⚡ O PULO DO GATO: Se a imagem existir na pasta public, desenha a imagem!
        if (assets.tree && assets.tree.complete && assets.tree.naturalHeight !== 0) {
            ctx.drawImage(assets.tree, ex - 15, ey - 30, 30, 40);
        } else {
            // Se você ainda não subiu a imagem, desenha o backup em código pra não quebrar o jogo
            ctx.fillStyle = '#451a03'; ctx.fillRect(ex - 3, ey - 5, 6, 12); 
            ctx.fillStyle = '#065f46'; ctx.beginPath(); ctx.arc(ex, ey - 10, 10, 0, Math.PI*2); ctx.fill(); 
        }
      } 
      else if (e.type === 'Jazida de Ouro') {
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(ex - 2, ey - 2, 3, 0, Math.PI*2); ctx.fill(); 
      }
      else if (e.type === 'Cervo' || e.type === 'Lobo') {
        ctx.fillStyle = e.type === 'Lobo' ? '#334155' : '#d97706';
        ctx.fillRect(ex - 6, ey - 4, 12, 8); ctx.fillRect(ex + 4, ey - 8, 5, 5); 
      }
    });

    structures.forEach(s => {
      const sx = s.x * scaleX; const sy = s.y * scaleY;
      
      if (s.type === 'Casa') {
         // ⚡ Lê a foto da casa se ela estiver na pasta public
         if (assets.house && assets.house.complete && assets.house.naturalHeight !== 0) {
            ctx.drawImage(assets.house, sx - 20, sy - 30, 40, 40);
         } else {
            ctx.fillStyle = '#b45309'; ctx.fillRect(sx - 14, sy - 10, 28, 20); 
            ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.moveTo(sx - 18, sy - 10); ctx.lineTo(sx, sy - 25); ctx.lineTo(sx + 18, sy - 10); ctx.fill();
         }
      }
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(s.agent_name, sx, sy - 32); ctx.shadowBlur = 6;
    });

    agents.forEach(a => {
      if (a.hp <= 0) return;
      const ax = a.x * scaleX; const ay = a.y * scaleY;
      
      ctx.fillStyle = a.hp < 30 ? '#ef4444' : '#f8fafc';
      ctx.beginPath(); ctx.arc(ax, ay + 4, 7, Math.PI, 0); ctx.fill(); 
      ctx.beginPath(); ctx.arc(ax, ay - 6, 6, 0, Math.PI * 2); ctx.fill(); 
      ctx.fillStyle = '#0ea5e9'; ctx.fillRect(ax - 4, ay - 8, 8, 3); 

      ctx.shadowBlur = 0; 
      if (a.society && a.society !== 'Nenhuma') {
        ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#c084fc'; ctx.textAlign = 'center'; ctx.fillText(`[${a.society}]`, ax, ay - 24);
      }
      ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.fillText(a.name, ax, ay - 14); 
      ctx.fillStyle = '#4ade80'; ctx.fillText(a.name, ax-1, ay - 15);
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(ax - 12, ay + 12, 24, 4); ctx.fillStyle = '#22c55e'; ctx.fillRect(ax - 12, ay + 12, 24 * (a.hp / 100), 4);
      ctx.shadowBlur = 6; 
    });

  }, [worldState, agents, structures, entities, assets]); // <-- Agora recarrega quando as fotos ficarem prontas!

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000); 
    return () => clearInterval(interval);
  }, []);

  const btnStyle = { padding: '0.6rem 1.2rem', cursor: isChanging ? 'wait' : 'pointer', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontWeight: 'bold' };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#050505', color: '#e5e5e5', minHeight: '100vh' }}>
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '900px', marginBottom: '1rem', backgroundColor: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid #333' }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>👁️ Visão da Civilização - <span style={{color: '#4ade80'}}>Tick {worldState.current_tick}</span></h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button disabled={isChanging} onClick={resetWorld} style={{ ...btnStyle, backgroundColor: '#7f1d1d', borderColor: '#ef4444' }}>☄️ GERAR NOVO MAPA</button>
          </div>
        </div>

        <canvas 
          ref={canvasRef} 
          width={900} 
          height={600} 
          style={{ backgroundColor: '#000', borderRadius: '16px', border: '4px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }} 
        />
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>O motor agora suporta imagens reais (.png) da pasta public.</p>
      </section>

      {/* Os painéis de Livro das Eras e Cidadãos Ativos continuam inalterados aqui para baixo... */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', maxWidth: '1400px', margin: '0 auto' }}>
        <section style={{ flex: '1 1 400px' }}>
          <h2>📜 Livro das Eras</h2>
          <div style={{ backgroundColor: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid #333', height: '600px', overflowY: 'auto' }}>
            {events.map(ev => (
              <div key={ev.id} style={{ borderLeft: `3px solid ${ev.type === 'CONFLITO' ? '#ef4444' : ev.type === 'DIÁLOGO' ? '#3b82f6' : '#4ade80'}`, paddingLeft: '10px', paddingBottom: '0.8rem', marginBottom: '0.8rem', borderBottom: '1px solid #222' }}>
                <span style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>[Tick {ev.tick}] {ev.type}</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.95rem', color: '#eee' }}>{ev.message}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ flex: '2 1 700px' }}>
          <h2>🧠 Cidadãos Ativos ({agents.filter(a => a.hp > 0).length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {agents.map((agent) => (
              <div key={agent.id} style={{ backgroundColor: '#111', padding: '1.2rem', borderRadius: '12px', border: '1px solid #333', opacity: agent.hp <= 0 ? 0.3 : 1 }}>
                <h3 style={{ marginTop: 0, color: '#4ade80', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {agent.name} {agent.hp <= 0 && '💀'}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', backgroundColor: '#000', padding: '0.5rem', borderRadius: '6px', border: '1px solid #222' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>💧 {agent.water}</span>
                  <span style={{ color: '#eab308', fontWeight: 'bold' }}>🍖 {agent.food}</span>
                  <span style={{ color: '#8b5cf6' }}>🪵 {agent.wood}</span>
                  <span style={{ color: '#94a3b8' }}>⛏️ {agent.iron}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#aaa', minHeight: '40px', fontStyle: 'italic' }}>"{agent.action}"</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}