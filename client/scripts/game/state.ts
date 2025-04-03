import { ShardsOfBeyondActionType, CrystalZone, Owned, Deck, Lane, Slot, Card, Costs, REALM_MAPPING, BeyondGameState, Player, Hand, Container } from './types-game.js';
import { GameEngine } from '../engine/engine.js';
import { Component, FlatObject, LazyInitializer, Simple, Type } from '../engine/types-engine.js';
import { range } from '../engine/utility.js';

export type Lazy<T> = {
  [key in keyof T]: T[key] 
};

export const DEREFERENCE_SELF = <T>(self: unknown): T => self as T;

// TODO: Optionally accept game config parameters, which are handed from outside.
export const INITIALIZE_BEYOND_GAMESTATE = (
  engine: GameEngine<BeyondGameState, ShardsOfBeyondActionType>
): BeyondGameState => {

  const createOwnedCardContainer = (self: any, engine: GameEngine<BeyondGameState, ShardsOfBeyondActionType>, types: Type | Type[], name?: string): Owned & Container => engine.registerComponent({
    cards: engine.registerComponent([], 'container'),
    owner: DEREFERENCE_SELF(self)
  }, types, name);

  const players: Player[] = ['Rashid', 'Görzy'].map(name => engine.registerComponent({
    name: name,
    hand: (self) => createOwnedCardContainer(self, engine, 'hand', `${self.name}'s Hand`),
    crystalzone: (self) => createOwnedCardContainer(self, engine, 'crystalzone', `${self.name}'s Crystal Zone`),
    index: 0,
    deck: (self) => createOwnedCardContainer(self, engine, 'deck', `${self.name}'s Deck`)
  }, 'player', `Rashid`));

  const slots: Slot[] = range(5).map(x => range(4).map(y => 
    engine.registerComponent({
      x: x,
      y: y,
      card: undefined,
      lanes: (self, engine: GameEngine<BeyondGameState, ShardsOfBeyondActionType>) => engine.state.board.lanes
        .filter(lane => lane.orientation === 'horizontal'
          ? lane.index === self.y
          : lane.index === self.y)
    }, 'slot', `Slot ${x + 1}-${y + 1}`) as Slot))
    .flat();

  const lanes: Lane[] = [
    // Vertical Lanes
    ...range(5).map(index => engine.registerComponent({
      index: index,
      orientation: 'vertical',
      $slots: (self, engine: GameEngine<BeyondGameState, ShardsOfBeyondActionType>) => engine.record(
        () => (engine.components
          .filter(c => c.types.includes('slot')) as Component<Slot>[])
          .filter(slot => slot.lanes.includes(self))
      ),
      $cards: (self, engine: GameEngine<BeyondGameState, ShardsOfBeyondActionType>) => engine.record(
        () => self.$slots
          .filter(slot => slot.card !== undefined)
          .map(slot => slot.card!)
      ),
      $wonByPlayer: (self, engine: GameEngine<BeyondGameState, ShardsOfBeyondActionType>) => engine.record(
        () => self.$cards.length < self.$slots.length
          ? undefined
          : undefined // TODO
      )
    }, 'lane', `Vertical Lane #${index + 1}`) as Lane)
  ];

  return {
    players: players,
    board: {
      slots: slots,
      lanes: lanes
    },
    turn: {
      currentPlayer: players[0]
    }
  };
};