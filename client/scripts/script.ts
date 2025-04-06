// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

import { range } from './engine/utility.js';
import { Card, CardType, Lane, Rarity, RawCard, Realm, REALM_MAPPING, ShardsOfBeyondActionType, Slot, Subtype } from './game/types-game.js';
import { GameEngine } from './engine/engine.js';
import { INITIALIZE_BEYOND_GAMESTATE } from './game/state.js';

// CONSTANTS
const cardFile = 'https://cdn.shardsofbeyond.com/client/cards.json';

// Register engine and all types.
const engine = new GameEngine<ShardsOfBeyondActionType>();
INITIALIZE_BEYOND_GAMESTATE(engine);

// For easier debugging.
window['engine'] = engine;

// Register players.
// TEST: Automatically generate actor ID.
// TEST: Check that actor IDs are unique.

// SCRIPT
document.addEventListener('DOMContentLoaded', async () => {
  const request = await fetch(cardFile);
  const cards: Card[] = (await request.json() as RawCard[])
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

  // log(`Loaded a total of ${cards.length} cards!`, undefined, true);

  // Fill each Players deck with 30 random cards.
  /*
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
  */

  engine.start();
  console.log('Engine after initialization:', engine);
});
