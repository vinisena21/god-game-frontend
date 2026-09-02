import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export default function App() {
  const [worldState, setWorldState] = useState({ current_tick: 0, weather: 'Carregando...' });
  const [agents, setAgents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isChanging, setIsChanging] = useState(false);
  const [miracleText, setMiracleText] = useState<{ [key: number]: string }>({});
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const changeWeather = async (newWeather: string) => {
    setIsChanging(true);
    await fetch(`${API_URL}/api/world/weather`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weather: newWeather }) });
    fetchData(); setIsChanging(false);
  };

  const resetWorld = async () => {
    if (!window.confirm("⚠️ GERAR NOVA ILHA? A civilização recomeçará com novo relevo.")) return;
    setIsChanging(true);
    await fetch(`${API_URL}/api/world/reset`, { method: 'POST' });
    fetchData(); setIsChanging(false);
  };

  const sendMiracle = async (agentId: number, name: string) => {
    const text = miracleText[agentId];
    if (!text) return;
    await fetch(`${API_URL}/api/agents/${agentId}/miracle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
    setMiracleText(prev => ({ ...prev, [agentId]: '' })); fetchData();
  };

  const handleMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dbX = Math.round((x / canvas.width) * 100);
    const dbY = Math.round((y / canvas.height) * 100);
    alert(`⚡ MODO DEUS ATIVADO\nVocê mirou em [X: ${dbX}, Y: ${dbY}]. O motor de edição de terreno será plugado aqui!`);
  };

  // 🎨 MOTOR GRÁFICO - RENDERIZAÇÃO VETORIAL (Estilo RimWorld/Indie)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = width / 100; 

    // Limpeza e Fundo do Oceano
    ctx.clearRect(0, 0, width, height);
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Configurando as sombras globais para dar efeito 3D no mapa
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    // A Ilha (Grama)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9, 40);
    else ctx.fillRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
    ctx.fill();

    // Desliga sombra grossa para desenhar o rio e grade
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // O Rio Central (X = 50) com profundidade
    const riverGradient = ctx.createLinearGradient(50 * scale - 20, 0, 50 * scale + 20, 0);
    riverGradient.addColorStop(0, '#0284c7');
    riverGradient.addColorStop(0.5, '#38bdf8');
    riverGradient.addColorStop(1, '#0284c7');
    ctx.fillStyle = riverGradient;
    ctx.beginPath();
    ctx.moveTo(50 * scale - 20, height * 0.05);
    ctx.lineTo(50 * scale + 20, height * 0.05);
    ctx.lineTo(50 * scale + 10, height * 0.95);
    ctx.lineTo(50 * scale - 30, height * 0.95);
    ctx.fill();

    // Reativa a sombra para as Entidades 3D
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 3;

    // 🌲 Função para desenhar Árvores
    const drawTree = (x: number, y: number) => {
      ctx.fillStyle = '#451a03'; // Tronco
      ctx.fillRect(x - 3, y - 5, 6, 10);
      ctx.fillStyle = '#166534'; // Folhas Camada 1
      ctx.beginPath(); ctx.moveTo(x - 12, y - 5); ctx.lineTo(x + 12, y - 5); ctx.lineTo(x, y - 20); ctx.fill();
      ctx.fillStyle = '#15803d'; // Folhas Camada 2
      ctx.beginPath(); ctx.moveTo(x - 10, y - 12); ctx.lineTo(x + 10, y - 12); ctx.lineTo(x, y - 25); ctx.fill();
    };

    // 🪙 Função para desenhar Ouro
    const drawGold = (x: number, y: number) => {
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 10); ctx.lineTo(x - 8, y); ctx.fill();
      ctx.fillStyle = '#fef08a'; // Brilho
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 4, y); ctx.fill();
    };

    // 🦌 Fauna e Monstros
    const drawAnimal = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 5, y - 5, 4, 0, Math.PI * 2); ctx.fill(); // Cabeça
    };

    // 🏘️ Função para desenhar Casa
    const drawHouse = (x: number, y: number) => {
      ctx.fillStyle = '#78350f'; // Base de madeira
      ctx.fillRect(x - 12, y - 10, 24, 20);
      ctx.fillStyle = '#000'; // Porta
      ctx.fillRect(x - 3, y, 6, 10);
      ctx.fillStyle = '#7f1d1d'; // Teto
      ctx.beginPath(); ctx.moveTo(x - 16, y - 10); ctx.lineTo(x + 16, y - 10); ctx.lineTo(x, y - 25); ctx.fill();
    };

    // 🤖 Função para desenhar a IA (RimWorld Pawn Style)
    const drawAgent = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      // Corpo (Pílula cortada)
      ctx.beginPath(); ctx.arc(x, y + 5, 8, Math.PI, 0); ctx.fill();
      // Cabeça
      ctx.beginPath(); ctx.arc(x, y - 6, 6, 0, Math.PI * 2); ctx.fill();
      // Viseira Cibernética
      ctx.fillStyle = '#38bdf8'; // Azul neon
      ctx.fillRect(x - 4, y - 8, 8, 3);
    };

    // Renderiza Entidades do Mapa
    entities.forEach(e => {
      const ex = e.x * scale; const ey = e.y * scale;
      if (e.type === 'Árvore Anciã') drawTree(ex, ey);
      else if (e.type === 'Jazida de Ouro') drawGold(ex, ey);
      else if (e.type === 'Cervo') drawAnimal(ex, ey, '#b45309');
      else if (e.type === 'Lobo') drawAnimal(ex, ey, '#475569');
    });

    // Renderiza Estruturas Construídas
    structures.forEach(s => {
      const sx = s.x * scale; const sy = s.y * scale;
      if (s.type === 'Casa') drawHouse(sx, sy);
      else if (s.type === 'Ponte') {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(sx - 20, sy - 15, 40, 30);
      }
      // Etiqueta do dono da estrutura
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '9px Arial'; ctx.textAlign = 'center';
      ctx.fillText(s.agent_name, sx, sy - 28);
      ctx.shadowBlur = 4; // Liga a sombra de novo
    });

    // Renderiza os Agentes
    agents.forEach(a => {
      if (a.hp <= 0) return;
      const ax = a.x * scale; const ay = a.y * scale;
      
      drawAgent(ax, ay, a.hp < 30 ? '#ef4444' : '#f8fafc'); // Fica vermelho se estiver quase morrendo!

      ctx.shadowBlur = 0; // Desliga a sombra para desenhar os textos nítidos
      
      // Nome e Sociedade
      if (a.society && a.society !== 'Nenhuma') {
        ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#a855f7'; ctx.textAlign = 'center';
        ctx.fillText(`[${a.society}]`, ax, ay - 28);
      }
      ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#4ade80'; ctx.textAlign = 'center';
      ctx.fillText(a.name, ax, ay - 16);

      // Barra de Vida
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(ax - 12, ay + 12, 24, 4);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(ax - 12, ay + 12, 24 * (a.hp / 100), 4);
      ctx.shadowBlur = 4; // Religa a sombra
    });

  }, [worldState, agents, structures, entities]); 

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const btnStyle = { padding: '0.6rem 1.2rem', cursor: isChanging ? 'wait' : 'pointer', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontWeight: 'bold' };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#050505', color: '#e5e5e5', minHeight: '100vh' }}>
      
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '900px', marginBottom: '1rem', backgroundColor: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid #333' }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>👁️ Visão Divina - <span style={{color: '#4ade80'}}>Tick {worldState.current_tick}</span> | {worldState.weather}</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button disabled={isChanging} onClick={resetWorld} style={{ ...btnStyle, backgroundColor: '#7f1d1d', borderColor: '#ef4444' }}>☄️ GERAR NOVA ILHA</button>
          </div>
        </div>

        <canvas 
          ref={canvasRef} 
          width={900} 
          height={600} 
          onClick={handleMapClick}
          style={{ 
            backgroundColor: '#000', 
            borderRadius: '16px', 
            border: '4px solid #1e293b', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            cursor: 'crosshair'
          }} 
        />
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>O motor Vetorial 2D está ativo. Clique no mapa para usar o Modo Deus.</p>
      </section>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', maxWidth: '1400px', margin: '0 auto' }}>
        <section style={{ flex: '1 1 400px' }}>
          <h2>📜 História da Civilização</h2>
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
                {agent.hp > 0 && (
                  <div style={{ display: 'flex', marginTop: '1rem', gap: '0.5rem' }}>
                    <input type="text" placeholder="Intervir..." value={miracleText[agent.id] || ''} onChange={(e) => setMiracleText(prev => ({ ...prev, [agent.id]: e.target.value }))} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px' }} />
                    <button onClick={() => sendMiracle(agent.id, agent.name)} style={{ padding: '0.5rem', cursor: 'pointer', backgroundColor: '#4ade80', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Enviar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}