import { AIClient } from './ai-client.js';
import { BeyondClient } from '../client/beyond-client.js';
import { GameEngine } from '../engine/engine.js';
import { INITIALIZE_BEYOND } from '../game/beyond.js';
import { Player, RawCard } from '../game/types-game.js';

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

engine.start();