import { ShardsOfBeyondActionType, Owned, Lane, Slot, Card, Player, Container, Turn, Hand, Deck, CrystalZone, RawCard, Rarity, CardType, Subtype, Realm, REALM_MAPPING } from './types-game.js';
import { GameEngine } from '../engine/engine.js';
import { Component,  QueryFilter,  Simple,  Type } from '../engine/types-engine.js';
import { range, shuffle } from '../engine/utility.js';

// TODO: Optionally accept game config parameters, which are handed from outside (player names, starting deck...?).
export const INITIALIZE_BEYOND_GAMESTATE = (
  engine: GameEngine,
  cards: RawCard[]
): void => {

  // Players
  const players = ['Görzy', 'Rashid'].map((name, i) => {
    const player = engine.registerComponent({
      name: name,
      // @ts-ignore // FIXME ???
      hand: (self, engine) => engine.query<Hand>('hand').filter(hand => hand.owner === self)[0],
      deck: (self, engine) => engine.query<Deck>('deck').filter(deck => deck.owner === self)[0],
      crystalzone: (self, engine) => engine.query<CrystalZone>('crystalzone').filter(crystalzone => crystalzone.owner === self)[0],
      index: i,
      wonLanes: (self, engine) => engine.query<Lane>('lane').filter(lane => lane.wonBy === self)
    }, 'player', name) as Simple<Player>;

    const hand = engine.registerComponent({
      owner: player,
      cards: (self, engine) => engine.query<Card>('card').filter(c => c.location === self)
    }, 'hand', `${name}'s Hand`) as Simple<Hand>;

    const crystalzone = engine.registerComponent({
      owner: player,
      cards: (self, engine) => engine.query<Card>('card').filter(c => c.location === self)
    }, 'crystalzone', `${name}'s Crystal Zone`) as Simple<CrystalZone>;
    
    const deck = engine.registerComponent({
      owner: player,
      cards: (self, engine) => engine.query<Card>('card').filter(c => c.location === self)
    }, 'deck', `${name}'s Hand`) as Simple<Deck>;

    // Initialize 30 random cards and add them to each Deck!
    shuffle(cards).slice(0, 30)
      .filter(card => card.Cardtype === 'Unit')
      .map(card => {
        console.debug(`Loading ${card.Name}...`);

        engine.registerComponent({
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
            }),
          location: deck
        }, 'card', card.Name) as Simple<Card>;
      });

      return player;
    });

  // TURN
  const turn = engine.registerComponent({
    currentPlayer: players[0]
  }, 'turn', 'Turn') as Simple<Turn>;

  // Horizontal Lanes.
  range(4).forEach(i => {
    engine.registerComponent({
      index: i,
      slots: (self, engine) => engine.query<Slot>('slot').filter(slot => slot.y === self.index),
      cards: (self) => self.slots.filter(slot => slot.card !== undefined).map(slot => slot.card as Simple<Card>),
      isFull: (self) => self.slots.length === self.cards.length,
      wonBy: undefined,
      orientation: 'horizontal'
    }, 'lane', `Horizontal Lane ${i + 1}`) as Simple<Lane>;
  });

  // Vertical Lanes.
  range(5).forEach(i => {
    engine.registerComponent({
      index: i,
      slots: (self, engine) => engine.query<Slot>('slot').filter(slot => slot.x === self.index),
      cards: (self) => self.slots.filter(slot => slot.card !== undefined).map(slot => slot.card as Simple<Card>),
      isFull: (self) => self.slots.length === self.cards.length,
      wonBy: undefined,
      orientation: 'vertical'
    }, 'lane', `Vertical Lane ${i + 1}`) as Simple<Lane>;
  });

  // Slots
  range(4).forEach(x => range(5).forEach(y => {
    engine.registerComponent({
      x: x,
      y: y,
      card: (self, engine) => engine.query<Card>('card').filter(card => card.location === self),
      lanes: (self, engine) => engine.query<Lane>('lane').filter(lane => lane.slots.includes(self))
    }, 'slot', `Slot ${x}/${y}`) as Simple<Slot>;
  }));
};

export const REGISTER_BEYOND_LINGO = (engine: GameEngine): void => {
  
};