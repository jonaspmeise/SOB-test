import { Component, Query, Simple } from '../engine/types-engine.js';

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

// TODO: Technically not right to just name everything Simple<...> here...
export type Card = Component<Owned & {
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
  location: Container | Slot,
}>;

export type Slot = Component<{
  x: number,
  y: number,
  card?: Query<Slot, Card | undefined>,
  lanes: Query<Slot, Lane[]>
}>;

export type LaneOrientation = 'horizontal' | 'vertical';

export type Player = Component<{
  name: Readonly<string>,
  hand: Query<Player, Hand>
  crystalzone: Query<Player, CrystalZone>
  index: number,
  deck: Query<Player, Deck>
  wonLanes: Query<Player, Lane[]>
}>;

export type Lane = Component<{
  slots: Query<Lane, Slot[]>,
  cards: Query<Lane, Card[]>,
  isFull: Query<Lane, boolean>,
  orientation: LaneOrientation,
  index: number,
  wonBy: Player | undefined
}>;

export type Owned = {
  owner: Simple<Player>
};

export type Container = Component<{
  cards: Query<Container, Card[]>
}>;

export type Hand = Container & Owned;
export type Deck = Container & Owned;
export type CrystalZone = Container & Owned;

export type Turn = Component<{
  currentPlayer: Player
}>;