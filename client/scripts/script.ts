// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

import { log } from './engine/utility';
import { state, components, types } from './engine/state';
import { highlight, resetHandleContext } from './engine/interaction-handler';
import { rules } from './engine/rules';
import { triggers } from './engine/triggers';
import { Card, CardType, GameCard, Rarity, RawCard, Realm, REALM_MAPPING, ShardsOfBeyondActionType, ShardsOfBeyondState, Subtype } from './game/types-game';
import { UUID } from 'crypto';
import { GameEngine } from './engine/engine';
import { SHARDS_OF_BEYOND_ACTIONS } from './game/actions';
import { SHARDS_OF_BEYOND_INITIAL_STATE } from './game/state';

// CONSTANTS
const cardFile = 'https://cdn.shardsofbeyond.com/client/cards.json';

// Events: When clicking "anywhere else", reset the handleContext.
document.body.addEventListener('click', () => {
  resetHandleContext();
});

// Register engine and all types.
const engine = new GameEngine<ShardsOfBeyondState, ShardsOfBeyondActionType>(SHARDS_OF_BEYOND_INITIAL_STATE);
SHARDS_OF_BEYOND_ACTIONS.forEach(engine.registerAction);
engine.registerPlayer({name: 'Rashid'});
engine.registerPlayer({name: 'Görzy'});

// Assign debug for easier in-browser debugging.
Object.assign(window, {
  debug: engine
});

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
        artwork: new URL(card.Artworks.default),
        rarity: card.Rarity as Rarity,
        set: card.Set,
        power: card.Power,
        text: card.Text,
        cardtype: card.Cardtype as CardType,
        realms: card.Realms.split(' ').map(part => part.trim()) as Realm[],
        subtypes: card.Types.split(' ').map(part => part.trim()) as Subtype[],
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
  state.players.forEach(player => {
    new Array(30).forEach(() => {
      const randomCard = cards[Math.floor(Math.random() * cards.length)];

      // Add ownership to cards.
      player.deck$.push(engine.registerComponent({
        ...randomCard,
        owner: player.id,
        location: player.deck.id
      }, ['card'], randomCard.name).id);
    });
  });

  // Randomize starting player.
  state.turn.currentPlayer$ = state.players[0].id;

  // Each Player draws 5 cards from their Deck.
  state.players.forEach(player => {
    new Array(5).forEach(() => {
      //TODO: actions.draw(player.deck$);
    });
  });

  console.log('State after initialization:', state);
  highlight(state.actions, new Set(), true);
});
