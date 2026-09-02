import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export default function App() {
  const [worldState, setWorldState] = useState({ current_tick: 0, weather: 'Carregando...' });
  const [agents, setAgents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isChanging, setIsChanging] = useState(false);

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

  const resetWorld = async () => {
    if (!window.confirm("⚠️ GERAR NOVA ILHA? A civilização recomeçará do zero.")) return;
    setIsChanging(true);
    await fetch(`${API_URL}/api/world/reset`, { method: 'POST' });
    fetchData(); setIsChanging(false);
  };

  // 🎨 MOTOR GRÁFICO - GERAÇÃO PROCEDURAL ESTILO RPG
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scaleX = width / 100;
    const scaleY = height / 100;

    // 1. Fundo (Oceano Profundo)
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 2. Base da Ilha (Areia da praia, bordas arredondadas)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(width * 0.03, height * 0.03, width * 0.94, height * 0.94, 50);
    ctx.fill();

    // 3. O Chão Quadriculado (Estilo Tileset RPG Maker)
    ctx.save();
    ctx.beginPath();
    // Cria uma "máscara" para a grama não vazar da areia
    if (ctx.roundRect) ctx.roundRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9, 40);
    ctx.clip();

    // Desenhando os tiles de grama (Claro e Escuro intercalados)
    for (let x = 0; x < 100; x += 2) {
      for (let y = 0; y < 100; y += 2) {
        ctx.fillStyle = (x + y) % 4 === 0 ? '#10b981' : '#059669'; 
        ctx.fillRect(x * scaleX, y * scaleY, 2 * scaleX, 2 * scaleY);
      }
    }

    // 4. RIO ORGÂNICO (Estilo Raiz/Veia, com afluentes)
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7'; // Azul vibrante da água
    
    // Rio Principal (Curvado de ponta a ponta)
    ctx.lineWidth = 6 * scaleX;
    ctx.beginPath();
    ctx.moveTo(40 * scaleX, 0);
    ctx.bezierCurveTo(60 * scaleX, 30 * scaleY, 35 * scaleX, 60 * scaleY, 55 * scaleX, 100 * scaleY);
    ctx.stroke();

    // Afluente 1 (Raiz para a direita)
    ctx.lineWidth = 3 * scaleX;
    ctx.beginPath();
    ctx.moveTo(50 * scaleX, 45 * scaleY);
    ctx.quadraticCurveTo(70 * scaleX, 50 * scaleY, 85 * scaleX, 35 * scaleY);
    ctx.stroke();

    // Afluente 2 (Raiz para a esquerda)
    ctx.beginPath();
    ctx.moveTo(43 * scaleX, 75 * scaleY);
    ctx.quadraticCurveTo(20 * scaleX, 80 * scaleY, 15 * scaleX, 95 * scaleY);
    ctx.stroke();
    
    ctx.restore(); // Finaliza a máscara da ilha

    // 5. Sombras Globais para os elementos 3D pularem na tela
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 4;

    // --- FUNÇÕES DE DESENHO DOS ASSETS VETORIAIS --- //

    const drawTree = (x: number, y: number) => {
      ctx.fillStyle = '#451a03'; ctx.fillRect(x - 3, y - 5, 6, 12); // Tronco
      ctx.fillStyle = '#065f46'; ctx.beginPath(); ctx.arc(x, y - 10, 10, 0, Math.PI*2); ctx.fill(); // Folha base
      ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(x, y - 15, 8, 0, Math.PI*2); ctx.fill(); // Folha meio
      ctx.fillStyle = '#34d399'; ctx.beginPath(); ctx.arc(x - 2, y - 18, 4, 0, Math.PI*2); ctx.fill(); // Brilho topo
    };

    const drawGold = (x: number, y: number) => {
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI*2); ctx.fill(); // Pedra cinza
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(x - 2, y - 2, 3, 0, Math.PI*2); ctx.fill(); // Ouro incrustado
      ctx.beginPath(); ctx.arc(x + 3, y + 2, 2, 0, Math.PI*2); ctx.fill();
    };

    const drawAnimal = (x: number, y: number, color: string, isWolf: boolean) => {
      ctx.fillStyle = color;
      ctx.fillRect(x - 6, y - 4, 12, 8); // Corpo
      ctx.fillRect(x + 4, y - 8, 5, 5); // Cabeça focinho
      if (isWolf) {
         ctx.fillStyle = '#ef4444'; // Olho vermelho do lobo
         ctx.fillRect(x + 6, y - 7, 2, 2);
      }
    };

    const drawHouse = (x: number, y: number) => {
      ctx.fillStyle = '#b45309'; ctx.fillRect(x - 14, y - 10, 28, 20); // Base de madeira
      ctx.fillStyle = '#451a03'; ctx.fillRect(x - 4, y, 8, 10); // Porta
      
      // Telhado Isométrico (Formato de cabana)
      ctx.fillStyle = '#7f1d1d'; 
      ctx.beginPath(); ctx.moveTo(x - 18, y - 10); ctx.lineTo(x, y - 25); ctx.lineTo(x + 18, y - 10); ctx.fill();
      // Reflexo da luz no telhado
      ctx.fillStyle = '#991b1b';
      ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x, y - 22); ctx.lineTo(x + 14, y - 10); ctx.fill();
    };

    const drawAgent = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y + 4, 7, Math.PI, 0); ctx.fill(); // Corpo
      ctx.beginPath(); ctx.arc(x, y - 6, 6, 0, Math.PI * 2); ctx.fill(); // Cabeça
      ctx.fillStyle = '#0ea5e9'; ctx.fillRect(x - 4, y - 8, 8, 3); // Viseira cibernética
    };

    // Renderiza Entidades Físicas (Árvores, Ouro, Fauna)
    entities.forEach(e => {
      const ex = e.x * scaleX; const ey = e.y * scaleY;
      if (e.type === 'Árvore Anciã') drawTree(ex, ey);
      else if (e.type === 'Jazida de Ouro') drawGold(ex, ey);
      else if (e.type === 'Cervo') drawAnimal(ex, ey, '#d97706', false);
      else if (e.type === 'Lobo') drawAnimal(ex, ey, '#334155', true);
    });

    // Renderiza Construções
    structures.forEach(s => {
      const sx = s.x * scaleX; const sy = s.y * scaleY;
      if (s.type === 'Casa') drawHouse(sx, sy);
      else if (s.type === 'Ponte') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx - 15, sy - 15, 30, 30);
        ctx.fillStyle = '#b45309'; // Desenha as tábuas da ponte
        for(let i = -10; i <= 10; i+=5) ctx.fillRect(sx - 15, sy + i, 30, 2);
      }
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(s.agent_name, sx, sy - 28);
      ctx.shadowBlur = 6;
    });

    // Renderiza as Inteligências Artificiais
    agents.forEach(a => {
      if (a.hp <= 0) return;
      const ax = a.x * scaleX; const ay = a.y * scaleY;
      
      drawAgent(ax, ay, a.hp < 30 ? '#ef4444' : '#f8fafc'); // Pisca vermelho se tiver quase morrendo

      ctx.shadowBlur = 0; 
      
      // Etiqueta de Sociedade
      if (a.society && a.society !== 'Nenhuma') {
        ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#c084fc'; ctx.textAlign = 'center';
        ctx.fillText(`[${a.society}]`, ax, ay - 24);
      }
      
      // Nome com Sombra Textual
      ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#111'; ctx.textAlign = 'center';
      ctx.fillText(a.name, ax, ay - 14); 
      ctx.fillStyle = '#4ade80'; ctx.fillText(a.name, ax-1, ay - 15);

      // Barra de Vida
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(ax - 12, ay + 12, 24, 4);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(ax - 12, ay + 12, 24 * (a.hp / 100), 4);
      ctx.shadowBlur = 6; 
    });

  }, [worldState, agents, structures, entities]); 

  // ⚡ FRONT-END AGORA ATUALIZA A CADA 1 SEGUNDO
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
          style={{ 
            backgroundColor: '#000', 
            borderRadius: '16px', 
            border: '4px solid #1e293b', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            cursor: 'crosshair'
          }} 
        />
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>Motor Vetorial Procedural Ativado.</p>
      </section>

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