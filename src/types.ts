export interface WorldState {
  current_tick: number;
  weather: string;
}

export interface Agent {
  id: number;
  name: string;
  action: string;
  hp: number;
  water: number;
  food: number;
  wood: number;
  iron: number;
  weapon?: number;
  shield?: number;
  x: number;
  y: number;
  society: string;
}

export interface Structure {
  id?: number;
  agent_name: string;
  type: string;
  x: number;
  y: number;
  hp?: number;
}

export interface Entity {
  id: number;
  type: string;
  x: number;
  y: number;
  hp: number;
  resource_amount?: number;
}

export interface GameEvent {
  id: number;
  tick: number;
  type: string;
  message: string;
}

export interface GameState {
  world: WorldState;
  agents: Agent[];
  structures: Structure[];
  entities: Entity[];
  events: GameEvent[];
}

export type GodAction = 'RAIO' | 'MILAGRE';
