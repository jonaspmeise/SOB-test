import { Component } from '../engine/types-engine.js';

export const REALM_MAPPING: RealmMapping = new Map();
REALM_MAPPING.set('D', 'Divine');
REALM_MAPPING.set('E', 'Elemental');
REALM_MAPPING.set('M', 'Mortal');
REALM_MAPPING.set('N', 'Nature');
REALM_MAPPING.set('V', 'Void');
REALM_MAPPING.set('?', 'NO_REALM');

export type ShardsOfBeyondActionArrayType = ['summon', 'draw', 'crystallize', 'pass', 'conquer'];
export type ShardsOfBeyondActionType = ShardsOfBeyondActionArrayType[number];
export type ActionColors = {[key in ShardsOfBeyondActionType]: string | undefined};

/** The Card the way it is saved in our json. */
export type RawCard = {
  Cardtype: CardType,
  Types: string,
  Costs: string,
  Rarity: Rarity,
  Set: number,
  Text: string,
  ID: string,
  Realms: string,
  Power: number,
  Name: string,
  Artworks: {
    default: string
  }
};

export type CardType = 'Unit' | 'Terrain';
export type Subtype = string;
export type Realm = 'Divine' | 'Void' | 'Elemental' | 'Mortal' | 'Nature' | 'NO_REALM';
export type RealmCount = {[key in Realm]: number};
export type RealmMapping = Map<string, Realm>;
export type Costs = {
  [key in Realm | 'total']: number
};
export type Rarity = 'Common' | 'Uncommon' | 'Rare';

export type Card = {
  cardtype: CardType,
  subtypes: Subtype[],
  costs: Costs,
  rarity: Rarity,
  set: number,
  text: string,
  realms: Realm[],
  power: number,
  name: string,
  artwork: URL,
  location?: Container
};
export type Slot = {
  x: number,
  y: number,
  card?: Card,
  lanes: Lane[]
};

export type LaneOrientation = 'horizontal' | 'vertical';
export type Player = {
  name: Readonly<string>,
  hand: Hand,
  crystalzone: CrystalZone,
  index: number,
  deck: Deck
};
export type Lane = {
  // $ means that this is realized using a query!
  $slots: Slot[],
  $cards: Card[],
  orientation: LaneOrientation,
  index: number,
  $wonByPlayer?: Player
};
export type Owned = {owner: Player};
export type Container = {
  cards: Card[];
};
export type Hand = Container & Owned;
export type Deck = Container & Owned;
export type CrystalZone = Container & Owned;
export type Turn = {
  currentPlayer: Player
};