# God Game — Frontend (Painel do Criador)

Interface em tempo real do **God Game**, um simulador de civilização onde você é o deus.

## Stack

- React 19 + TypeScript + Vite
- Socket.io-client (estado ao vivo)
- Canvas 2D para o mapa

## Como rodar

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm run dev
```

O frontend espera o backend em `http://localhost:3333` (ou o valor de `VITE_API_URL`).

## Controles

| Ação | Efeito |
|------|--------|
| Clique esquerdo no mapa | ⚡ Raio (destruição) |
| Clique direito no mapa | ✨ Milagre (cria Árvore Anciã) |
| Clique em um cidadão | Seleciona e mostra detalhes |
| Botão "Gerar Nova Ilha" | Reseta o mundo |

## Estrutura

```
src/
  App.tsx      # UI principal + canvas
  types.ts     # Tipos do jogo
  main.tsx
  index.css
```

## Backend

Este frontend é consumido pelo repositório irmão: [god-game-backend](https://github.com/vinisena21/god-game-backend).
