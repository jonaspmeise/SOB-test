import { AIClientIntegrator } from './ai-client-integrator.js';
import { BeyondClient } from '../client/beyond-client.js';
import { GameEngine } from '../engine/engine.js';
import { INITIALIZE_BEYOND } from '../game/beyond.js';
import { Player, RawCard } from '../game/types-game.js';
import { BeyondClientIntegrator } from '../client/beyond-client-integrator.js';

// Register engine and all types.
const engine = new GameEngine();

const cardFile = 'https://cdn.shardsofbeyond.com/client/cards.json';
const request = await fetch(cardFile);
const cards = (await request.json() as RawCard[]);

INITIALIZE_BEYOND(engine, cards);

// For easier debugging.
window['engine'] = engine;

// SCRIPT
// Register players.
const player = engine.registerInterface({
  tickHandler: (delta, choices) => {},
  actorId: 'Görzy',
  avatar: engine.query<Player>('player')[0]
});
player.tickHandler = new BeyondClientIntegrator(new BeyondClient()).handleTick

const ai = engine.registerInterface({
  tickHandler: (delta, choices) => {},
  actorId: 'Rashid',
  avatar: engine.query<Player>('player')[1]
});
ai.tickHandler = new AIClientIntegrator(engine, ai.actorId).tickHandler;

engine.start();