import { AIClient } from './ai-client.js';
import { BeyondClient } from '../client/beyond-client.js';
import { GameEngine } from '../engine/engine.js';
import { INITIALIZE_BEYOND } from '../game/beyond.js';
import { Player, RawCard } from '../game/types-game.js';

// CONSTANTS
const cardFile = 'https://cdn.shardsofbeyond.com/client/cards.json';

// Register engine and all types.
const engine = new GameEngine();

const request = await fetch(cardFile);
const cards = (await request.json() as RawCard[]);

const startTime = new Date().getTime();

INITIALIZE_BEYOND(engine, cards);

const endTime = new Date().getTime();


console.info(`Loaded game in ${(endTime - startTime) / 1000} seconds.`);

// For easier debugging.
window['engine'] = engine;

// SCRIPT
console.log('???');
document.addEventListener('DOMContentLoaded', () => {
  console.log(`Starting engine...`);

  console.log('Engine after initialization:', engine);
});

engine.start();

// Register players.
engine.registerInterface({
  tickHandler: new BeyondClient().tickHandler,
  actorId: 'Görzy',
  avatar: engine.query<Player>('player')[0]
});
engine.registerInterface({
  tickHandler: new AIClient().tickHandler,
  actorId: 'Rashid',
  avatar: engine.query<Player>('player')[1]
});