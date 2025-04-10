import { ShardsOfBeyondActionType, Owned, Lane, Slot, Card, Player, Container, Turn, Hand, Deck, CrystalZone } from './types-game.js';
import { GameEngine } from '../engine/engine.js';
import { Component,  Lazy,  QueryFilter,  Simple,  Type } from '../engine/types-engine.js';
import { range } from '../engine/utility.js';

// TODO: Optionally accept game config parameters, which are handed from outside (player names, starting deck...?).
export const INITIALIZE_BEYOND_GAMESTATE = (
  engine: GameEngine
): void => {

  // Players
  ['Görzy', 'Rashid'].forEach((name, i) => {
    const player = engine.registerComponent({
      name: name,
      // @ts-ignore // FIXME ???
      hand: (self, engine) => (engine.query('hand') as Simple<Hand>[]).filter(hand => hand.owner === self)[0],
      deck: (self, engine) => (engine.query('deck') as Simple<Deck>[]).filter(deck => deck.owner === self)[0],
      crystalzone: (self, engine) => (engine.query('crystalzone') as Simple<CrystalZone>[]).filter(crystalzone => crystalzone.owner === self)[0],
      index: i,
      wonLanes: (self, engine) => (engine.query('lane') as Simple<Lane>[]).filter(lane => lane.wonBy === self)
    }, 'player', name) as Simple<Player>;

    const hand = engine.registerComponent({
      owner: player,
      cards: (self, engine) => (engine.query('card') as Simple<Card>[]).filter(c => c.location === self)
    }, 'hand', `${name}'s Hand`) as Simple<Hand>;

    const crystalzone = engine.registerComponent({
      owner: player,
      cards: (self, engine) => (engine.query('card') as Simple<Card>[]).filter(c => c.location === self)
    }, 'crystalzone', `${name}'s Crystal Zone`) as Simple<CrystalZone>;
    
    const deck = engine.registerComponent({
      owner: player,
      cards: (self, engine) => (engine.query('card') as Simple<Card>[]).filter(c => c.location === self)
    }, 'deck', `${name}'s Hand`) as Simple<Deck>;
  });

  // Horizontal Lanes.
  range(4).forEach(i => {
    engine.registerComponent({
      index: i,
      slots: (self, engine) => (engine.query('slot') as Simple<Slot>[]).filter(slot => slot.y === self.index),
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
      slots: (self, engine) => (engine.query('slot') as Simple<Slot>[]).filter(slot => slot.x === self.index),
      cards: (self) => self.slots.filter(slot => slot.card !== undefined).map(slot => slot.card as Simple<Card>),
      isFull: (self) => self.slots.length === self.cards.length,
      wonBy: undefined,
      orientation: 'vertical'
    }, 'lane', `Vertical Lane ${i + 1}`) as Simple<Lane>;
  });

  type a = Simple<Lane>['cards'];

  // Slots
  range(4).forEach(x => range(5).forEach(y => {
    engine.registerComponent({
      x: x,
      y: y,
      card: (self, engine) => (engine.query('card') as Simple<Card>[]).filter(card => card.location === self),
      lanes: (self, engine) => (engine.query('lane') as Simple<Lane>[]).filter(lane => lane.slots.includes(self))
    }, 'slot', `Slot ${x}/${y}`) as Simple<Slot>;
  }));
};