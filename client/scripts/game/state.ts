import { ShardsOfBeyondActionType, Owned, Lane, Slot, Card, Player, Container } from './types-game.js';
import { GameEngine } from '../engine/engine.js';
import { Component,  Lazy,  QueryFilter,  Type } from '../engine/types-engine.js';
import { range } from '../engine/utility.js';

export const DEREFERENCE_SELF = <T>(self: unknown): T => self as T;

// TODO: Optionally accept game config parameters, which are handed from outside.
export const INITIALIZE_BEYOND_GAMESTATE = (
  engine: GameEngine<ShardsOfBeyondActionType>
): void => {

  // Turn
  engine.registerComponent({
    currentPlayer: undefined
  }, 'turn', 'Turn')

  const createOwnedCardContainer = (self: any, engine: GameEngine<ShardsOfBeyondActionType>, types: Type | Type[], name?: string): Component<Owned & Container> => engine.registerComponent({
    cards: (engine, self) => (engine.query('card') as Component<Card>[]).filter(c => c.location?.id === self.id),
    owner: DEREFERENCE_SELF(self)
  }, types, name);

  // Players.
  ['Rashid', 'Görzy'].map(name => engine.registerComponent({
    name: name,
    hand$: (engine, self) => createOwnedCardContainer(self, engine, 'hand', `${self.name}'s Hand`),
    crystalzone$: (engine, self) => createOwnedCardContainer(self, engine, 'crystalzone', `${self.name}'s Crystal Zone`),
    index: 0,
    deck$: (engine, self) => createOwnedCardContainer(self, engine, 'deck', `${self.name}'s Deck`)
  }, 'player', `Rashid`) as Component<Player>);

  // Lanes
  // Vertical Lanes
  range(5).map(index => engine.registerComponent({
    index: index,
    orientation: 'vertical',
    slots$: (engine: GameEngine<ShardsOfBeyondActionType>, self) => (engine.query('slots') as Component<Slot>[])
      .filter(slot => slot.lanes$.find(lane => lane.id === self.id) !== undefined
    ),
    cards: (_engine, self) => self.slots$
      .filter(slot => slot.card !== undefined)
      .map(slot => slot.card! as Component<Card>),
    wonByPlayer: (engine: GameEngine<ShardsOfBeyondActionType>, self) => self.cards.length < self.slots$.length
      ? undefined
      : (engine.query('players') as Component<Player>[])[0] // TODO
  }, 'lane', `Vertical Lane #${index + 1}`) as Component<Lane>);
    
  // Horizontal Lanes
  range(4).map(index => engine.registerComponent({
    index: index,
    orientation: 'horizontal',
    slots$: (engine: GameEngine<ShardsOfBeyondActionType>, self) => (engine.query('slots') as Component<Slot>[])
      .filter(slot => slot.lanes$.find(lane => lane.id === self.id) !== undefined
    ),
    cards: (_engine, self) => self.slots$
      .filter(slot => slot.card !== undefined)
      .map(slot => slot.card! as Component<Card>),
    wonByPlayer: (engine: GameEngine<ShardsOfBeyondActionType>, self) => self.cards.length < self.slots$.length
      ? undefined
      : (engine.query('players') as Component<Player>[])[0] // TODO
  }, 'lane', `Horizontal Lane #${index + 1}`) as Component<Lane>);
  
  // Slots.
  range(5).map(x => range(4).map(y => 
    engine.registerComponent({
      x: x,
      y: y,
      card: (engine, self) => (engine.query('cards') as Component<Card>[]).filter(c => c.location?.id === self.id)[0],
      lanes$: (engine: GameEngine<ShardsOfBeyondActionType>, self) => (engine.query('lanes') as Component<Lane>[])
        .filter(lane => lane.orientation === 'horizontal'
          ? lane.index === self.y
          : lane.index === self.y)
    }, 'slot', `Slot ${x + 1}-${y + 1}`) as Component<Slot>)
  );
};