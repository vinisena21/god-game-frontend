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
    if (!window.confirm("⚠️ GERAR MUNDO NOVO? Uma nova civilização vai começar do zero.")) return;
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

  // 🖱️ MOUSE: Captura cliques no mapa para o Modo Deus (Edição)
  const handleMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Converte os pixels para as coordenadas de 0 a 100 do Banco de Dados
    const dbX = Math.round((x / canvas.width) * 100);
    const dbY = Math.round((y / canvas.height) * 100);
    
    alert(`⚡ MODO DEUS: Você clicou em [X: ${dbX}, Y: ${dbY}].\n(Nas próximas atualizações, este clique vai "dropar" recursos mágicos ou explodir montanhas aqui!)`);
  };

  // 🎨 MOTOR GRÁFICO (Canvas 2D)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scale = width / 100; // 100 é o tamanho máximo do X e Y no banco

    // Limpa a tela inteira
    ctx.clearRect(0, 0, width, height);

    // 1. Oceano Profundo
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 2. A Ilha Orgânica (Grama)
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    // roundRect cria cantos arredondados, dando formato de ilha
    if (ctx.roundRect) {
      ctx.roundRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9, 50);
    } else {
      ctx.fillRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
    }
    ctx.fill();

    // 3. O Rio Central Selvagem (X = 50)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.beginPath();
    ctx.moveTo(50 * scale - 15, height * 0.05);
    ctx.lineTo(50 * scale + 15, height * 0.05);
    ctx.lineTo(50 * scale + 5, height * 0.95);
    ctx.lineTo(50 * scale - 25, height * 0.95);
    ctx.fill();

    // 4. Desenha Entidades (Flora e Fauna)
    entities.forEach(e => {
      const ex = e.x * scale; const ey = e.y * scale;
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      if (e.type === 'Árvore Anciã') ctx.fillText('🌲', ex, ey + 10);
      else if (e.type === 'Jazida de Ouro') ctx.fillText('🪙', ex, ey + 10);
      else if (e.type === 'Cervo') ctx.fillText('🦌', ex, ey + 10);
      else if (e.type === 'Lobo') ctx.fillText('🐺', ex, ey + 10);
    });

    // 5. Desenha Estruturas (Civilização)
    structures.forEach(s => {
      const sx = s.x * scale; const sy = s.y * scale;
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(s.type === 'Ponte' ? '🌉' : '🏘️', sx, sy + 10);
      
      // Nome do dono da casa
      ctx.font = '10px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText(s.agent_name, sx, sy - 15);
    });

    // 6. Desenha Agentes Vivos (Inteligências Artificiais)
    agents.forEach(a => {
      if (a.hp <= 0) return;
      const ax = a.x * scale; const ay = a.y * scale;

      // Nome da Sociedade
      if (a.society && a.society !== 'Nenhuma') {
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#a855f7';
        ctx.textAlign = 'center';
        ctx.fillText(`[${a.society}]`, ax, ay - 35);
      }

      // Nome do Agente
      ctx.font = 'bold 13px Arial';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'center';
      ctx.fillText(a.name, ax, ay - 20);

      // Barra de HP Estilo Videogame
      ctx.fillStyle = '#7f1d1d'; // Fundo vermelho
      ctx.fillRect(ax - 20, ay - 15, 40, 6);
      ctx.fillStyle = '#22c55e'; // Vida atual verde
      ctx.fillRect(ax - 20, ay - 15, 40 * (a.hp / 100), 6);

      // Corpo (Avatar)
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🤖', ax, ay + 12);
    });

  }, [worldState, agents, structures, entities]); // O Canvas redesenha sempre que o banco atualizar!

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const btnStyle = { padding: '0.6rem 1.2rem', cursor: isChanging ? 'wait' : 'pointer', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontWeight: 'bold' };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#050505', color: '#e5e5e5', minHeight: '100vh' }}>
      
      {/* MAPA CANVAS - A ILHA */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '900px', marginBottom: '1rem', backgroundColor: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid #333' }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>👁️ Visão Divina - <span style={{color: '#4ade80'}}>Tick {worldState.current_tick}</span> | {worldState.weather}</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button disabled={isChanging} onClick={() => changeWeather('Ensolarado')} style={btnStyle}>☀️ Sol</button>
             <button disabled={isChanging} onClick={resetWorld} style={{ ...btnStyle, backgroundColor: '#7f1d1d', borderColor: '#ef4444' }}>☄️ GERAR NOVA ILHA</button>
          </div>
        </div>

        {/* O MOTOR DE RENDERIZAÇÃO */}
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
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>Dica: Você pode clicar em qualquer lugar da ilha com o mouse!</p>
      </section>

      {/* PAINÉIS SOCIAIS E LOGS */}
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
                    <input type="text" placeholder="Conversar com a mente dele..." value={miracleText[agent.id] || ''} onChange={(e) => setMiracleText(prev => ({ ...prev, [agent.id]: e.target.value }))} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#000', color: '#fff', border: '1px solid #555', borderRadius: '4px' }} />
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