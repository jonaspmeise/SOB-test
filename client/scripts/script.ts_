// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

import { log, range } from './engine/utility';
import { BeyondPlayer, Card, CardType, GameCard, Lane, Rarity, RawCard, Realm, REALM_MAPPING, ShardsOfBeyondActionType, Slot, Subtype } from './game/types-game';
import { GameEngine } from './engine/engine';
import { SHARDS_OF_BEYOND_ACTIONS } from './game/actions';
import { INIT_SHARDS_OF_BEYOND_PLAYER } from './game/state';
import { BeyondClient } from './player-client/beyond-client';
import { AIClient } from './player-client/ai-client';
import { SHARDS_OF_BEYOND_TRIGGERS } from './game/triggers';
import { SHARDS_OF_BEYOND_RULES } from './game/rules';
import { ID, Player } from './engine/types-engine';

// CONSTANTS
const cardFile = 'https://cdn.shardsofbeyond.com/client/cards.json';


// Register engine and all types.
const engine = new GameEngine<ShardsOfBeyondActionType>();
// For easier debugging.
window['engine'] = engine;

// Register players.
// TEST: Automatically generate actor ID.
// TEST: Check that actor IDs are unique.
const playerA: BeyondPlayer = INIT_SHARDS_OF_BEYOND_PLAYER(engine, 'Rashid', 0);
const metaPlayerA = engine.registerPlayer({
  playerComponent: playerA.id,
  actorId: 'playerA',
  index: 0,
  client: new BeyondClient()
});
// TODO: Giga-Hack: Connect meta- and in-game-player.
playerA.meta = metaPlayerA;
// TODO: Strategy for AI. Optionally StateChangeHandler...
const playerB: BeyondPlayer = INIT_SHARDS_OF_BEYOND_PLAYER(engine, 'Görzy', 1);
const metaPlayerB = engine.registerPlayer({
  playerComponent: playerB.id,
  actorId: 'playerB',
  index: 1,
  client: new AIClient()
});
// TODO: Giga-Hack: Connect meta- and in-game-player.
playerB.meta = metaPlayerB;

// Registers Slots.
// TODO: Parameterize!
range(4).map((y) => 
  range(5).map((x) => {
    const slot = engine.registerComponent({
      card: undefined,
      x: x,
      y: y
    }, ['slot'], `Slot (${x}/${y})`) as Slot;

    slot.lanes = () => engine.types.get('lane')!
      .map(id => engine.components.get(id)! as Lane)
      .filter(lane => 
        lane.orientation === 'horizontal' 
          ? lane.index === slot.y
          : lane.index === slot.x
      );

    return slot;
  })
).flat();

// Lanes.
// Lanes - Utility.
const wonByPlayer: (l: Lane) => ID | undefined = (l: Lane) => {
  const slots = l
    .map(id => engine.components.get(id) as Slot);

  if(slots.find(slot => slot.card === undefined)) {
    return undefined;
  }
  
  const indexes = slots
    .reduce((prev, curr) => {
      if(curr.card === undefined) {
        return prev;
      }

      const card = engine.components.get(curr.card) as Card;
      const playerIndex = (engine.components.get(card.owner) as BeyondPlayer).index;

      prev[playerIndex] = prev[playerIndex] + card.power;

      return prev;
    }, [0, 0]);

    if(indexes[0] === indexes[1]) {
      // Draw!
      return undefined;
    }

    const winningPlayer = indexes[0] > indexes[1]
      ? 0
      : 1;

    return engine.types.get('player')!
      .map(id => engine.components.get(id) as BeyondPlayer)
      .filter(player => player.index === winningPlayer)[0].id;
};
// Register Horizontal Lanes.
range(4).map((i) => engine.registerComponent((() => {
  // @ts-ignore
  const lane = [] as Lane;
  lane.orientation = 'horizontal';
  lane.index = i;
  lane.push(...engine.types.get('slot')!
    .map(id => engine.components.get(id)! as Slot)
    .filter(slot => slot.y === i)
    .map(slot => slot.id)
  );
  lane.wonByPlayer = () => wonByPlayer(lane);

  return lane;
})(), 'lane', `Horizontal Lane #${i + 1}`));

range(5).map((i) => engine.registerComponent((() => {
  // @ts-ignore
  const lane = [] as Lane;
  lane.orientation = 'vertical';
  lane.index = i;
  lane.push(...engine.types.get('slot')!
    .map(id => engine.components.get(id)! as Slot)
    .filter(slot => slot.x === i)
    .map(slot => slot.id)
  );
  lane.wonByPlayer = () => wonByPlayer(lane);

  return lane;
})(), 'lane', `Vertical Lane #${i + 1}`));

// Register turn.
engine.registerComponent({
  currentPlayer: playerA.id
}, 'turn', 'Turn');

// Register triggers.
SHARDS_OF_BEYOND_TRIGGERS.forEach(engine.registerTrigger);

// Register actions.
SHARDS_OF_BEYOND_ACTIONS.forEach(engine.registerAction);

// Register rules.
SHARDS_OF_BEYOND_RULES.forEach(engine.registerRule);

// SCRIPT
document.addEventListener('DOMContentLoaded', async () => {
  const request = await fetch(cardFile);
  const cards: GameCard[] = (await request.json() as RawCard[])
    .filter(card => card.Set == 1) // Only valid cards from Set 1 should be made into decks.
    .filter(card => card.Cardtype === 'Unit') // Only play with Units.
    // Calculate costs of card nicely!
    .map(card => {
      return {
        name: card.Name,
        artwork: new URL(`https://cdn.shardsofbeyond.com/artworks/${card.Artworks.default}`),
        rarity: card.Rarity as Rarity,
        set: card.Set,
        power: card.Power,
        text: card.Text,
        cardtype: card.Cardtype as CardType,
        realms: card.Realms?.split(' ').map(part => part.trim()) as Realm[] ?? [],
        subtypes: card.Types?.split(' ').map(part => part.trim()) as Subtype[] ?? [],
        costs: card.Costs.split(',')
          .map(realm => realm.trim())
          .reduce((prev, curr) => {
            const realm: Realm | undefined = REALM_MAPPING.get(curr);

            if(realm === undefined) {
              console.error(`The part "${curr}" is not a valid cost!`);
              return prev;
            }
            
            prev[realm] = prev[realm] + 1;
            prev['total'] = prev['total'] + 1;

            return prev;
          }, {
            'Divine': 0,
            'Mortal': 0,
            'Elemental': 0,
            'Nature': 0,
            'Void': 0,
            'NO_REALM': 0,
            'total': 0
          })
      };
    });

  log(`Loaded a total of ${cards.length} cards!`, undefined, true);

  // Fill each Players deck with 30 random cards.
  engine.types.get('player')!.forEach(id => {
    const player = engine.components.get(id) as BeyondPlayer;

    range(30).forEach(() => {
      const randomCard = cards[Math.floor(Math.random() * cards.length)];

      // Add ownership to cards.
      // TODO: This is not type checked. The properties should be kept in a simple format.
      player.deck.push(engine.registerComponent({
        ...randomCard,
        owner: player.id,
        location: player.deck.id
      }, ['card'], randomCard.name).id);
    });
  });

  // Each Player draws 5 cards from their Deck.
  engine.types.get('deck')!.forEach(deck => {
    range(5).forEach(() => {
      engine.actions.draw(deck);
    });
  });

  engine.start();
  console.log('Engine after initialization:', engine);
});
