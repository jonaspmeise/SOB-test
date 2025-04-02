import { UUID } from "crypto";
import { Component, ID, Player } from "../engine/types-engine";

// TODO: Reference via ID needed? Can't just directly take the way around?
export type GameCard = {
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
  location?: ID
};

/** The Card the way it is saved in our json. */
export type RawCard = {
  Cardtype: CardType,
  Types: string,
  Costs: string,
  Rarity: Rarity,
  Set: number,
  Text: string,
  ID: UUID,
  Realms: string,
  Power: number,
  Name: string,
  Artworks: {
    default: string
  }
};

export type Card = GameCard & Owned & Component;

export type Owned = {
  owner: ID
};

export type Container = ID[] & Component;
export type OwnedContainer =  Owned & Container;
export type Deck = OwnedContainer;
export type Hand = OwnedContainer
export type CrystalZone = OwnedContainer & {
  supports: (costs: Costs) => boolean
}

export type CardType = 'Unit' | 'Terrain';
export type Subtype = string;
export type Realm = 'Divine' | 'Void' | 'Elemental' | 'Mortal' | 'Nature' | 'NO_REALM';
export type RealmCount = {[key in Realm]: number};
export type RealmMapping = Map<string, Realm>;
export type Costs = {
  [key in Realm | 'total']: number
};
export type Rarity = 'Common' | 'Uncommon' | 'Rare';

export const REALM_MAPPING: RealmMapping = new Map();
REALM_MAPPING.set('D', 'Divine');
REALM_MAPPING.set('E', 'Elemental');
REALM_MAPPING.set('M', 'Mortal');
REALM_MAPPING.set('N', 'Nature');
REALM_MAPPING.set('V', 'Void');
REALM_MAPPING.set('?', 'NO_REALM');

export type Slot = {
  x: number,
  y: number,
  lanes: () => Lane[]
  card?: ID
} & Component;

export type BeyondPlayer = {
  name: Readonly<string>,
  hand: Hand,
  crystalzone: CrystalZone,
  index: number,
  deck: Deck,
  wonLanes: ID[],
  meta: Player,
  powerPerLane: () => {[id: string]: number}
} & Component;

export type Turn = {
  currentPlayer: ID
} & Component;

export type LaneOrientation = 'horizontal' | 'vertical';
export type Lane = Container & {
  orientation: LaneOrientation,
  index: number,
  wonByPlayer: () => ID | undefined
} & Component;

export type ShardsOfBeyondActionType = ShardsOfBeyondActionArrayType[number];
export type ShardsOfBeyondActionArrayType = ['summon', 'draw', 'crystallize', 'pass', 'conquer'];
export type ActionColors = {[key in ShardsOfBeyondActionType]: string | undefined};