import Bun, { ServerWebSocket } from 'bun';
import { GameEngine } from '../engine/engine.js';
import { INITIALIZE_BEYOND } from '../game/beyond.js';
import { RawCard } from '../game/types-game.js';

type Lobby = {
  players: Map<string, ServerWebSocket<unknown>>,
  engine: GameEngine
};

type WebSocketMessage<T extends {}> = {
  type: 'join' | 'choice',
  parameters: T
};

const lobbies: Map<string, Lobby> = new Map();

Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }
    return new Response("Upgrade failed!", { status: 500 });
  },
  websocket: {
    message: async (ws, message) => {
      const data = JSON.parse(message as string) as WebSocketMessage<{lobbyId: string, player: string}>;

      switch(data.type) {
        case 'join':
          handleJoin(ws, data.parameters);
          break;

        case 'choice':
          console.log('CHOICE');
          break;

        default:
          console.error('User sent', message);
      }
    },
    open: (ws) => {
      console.log('A player joined!');
    },
    close: (ws, code, message) => {
      console.log('A player left.');
    },
    drain: (ws) => {
      console.log('Websocket backpressure!');
    }
  },
});

const handleJoin = async (ws: ServerWebSocket<unknown>, parameters: {lobbyId: string, player: string}) => {
  const { lobbyId, player } = parameters;

  // Create new Lobby + prepare Game...
  if (!lobbies.has(lobbyId)) {
    console.debug(`Lobby "${lobbyId}" doesn't exist yet - creating...`);

    const cardFile = 'https://cdn.shardsofbeyond.com/client/cards.json';
    const request = await fetch(cardFile);
    const cards = (await request.json() as RawCard[]);
    
    const engine = new GameEngine();
    // TODO: The real game should just be initialized once engine.start() is called! We need something like a start-script...
    INITIALIZE_BEYOND(engine, cards);

    lobbies.set(lobbyId, {
      players: new Map(),
      engine: new GameEngine()
    });
  }

  const lobby = lobbies.get(lobbyId)!;
  lobby.players.set(player, ws);

  if (lobby.players.size === 2) {
    lobby.engine.start();
  } else {
    console.log(`Waiting for 2 Players, ${lobby.players.size} joined so far...`);
  }
};