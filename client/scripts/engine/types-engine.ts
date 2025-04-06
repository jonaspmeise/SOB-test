import { GameEngine } from "./engine.js";

export type State = {};
/*
 {
    name: 'draw',
    execute: (deck, _model) => {
      const player = components.get(deck.owner$);
      
      const card = components.get(deck.pop());
      player.hand$.push(card.id);
      card.location$ = player.hand$.id;
      
      // Important: First parameter is always the player!
      return [player, deck];
    },
    log: (player, deck) => `${player} drew a card from ${deck}.`,
    color: 'blue'
  },
*/

/*
export type Action<
  T extends string,
  R,
  A extends Component,
  B extends (Component | undefined) = undefined
> = {
  name: T,
  execute: (engine: GameEngine<any>, a1?: A, a2?: B) => R,
  log: (appliedParameters: R) => string,
  color?: string
};
*/

/*
 name: 'Players may crystallize one card during their Turn from their Hand.',
  properties: {
    // Track per Player how many cards they crystallized already.
    alreadyCrystallized: [0, 0]
  },
  handler: (engine, properties) => {
    return model.players.map((player, i) => {
      // If it's not your Turn, do nothing.
      if(model.turn.currentPlayer$ !== player.id) {
        return undefined;
      }
      // If already crystallized, they may not crystallize.
      if(properties.alreadyCrystallized[player.index] > 0) {
        return undefined;
      }

      return player.hand$.map(card$ => {
        return {
          actor: player.id,
          type: 'crystallize',
          args: [card$, player.crystalzone$.id],
          // !!!
          callback: () => properties.alreadyCrystallized[player.index]++
        };
      });
    })
    .filter(action => action !== undefined)
    .flat();
  },
  // Reset conditions after every turn.
  onTrigger: (actionType, args, model, properties) => {
    if(actionType === 'pass') {
      properties.alreadyCrystallized = [0, 0];
    }
  }
*/
/*
export type Rule<T> = {
  name: string,
  properties?: T,
  handler: (engine: GameEngine<any>, properties: T) => CallbackableChoice[]
};

export type TriggerTiming = 'before' | 'after';

// TODO: Might need priority!
export type Trigger<A extends Action<any, any, any, any> | unknown, B = (A extends Action<any, any, any, any> ? ReturnType<A['execute']> : unknown)> = {
  name: string,
  actions: string[], // if undefined, then it's called for all actions!
  timing: TriggerTiming // whether to call the trigger before the state initialization (TODO: to potentially prevent certain actions...?) or after (reactive).
  effect: (engine: GameEngine<any>, actionType: A, parameter: B) => (() => void)[]
};

export type TriggerExecution<
  T extends Trigger<any, any>
> = {
  name: T['name'],
  execution: () => void
};
*/

export type Component<T> = {
  [key in keyof T]: T[key] extends Array<infer A>
  ? Component<A>[]
  : T[key] extends AtomicValue
    ? T[key]
    : undefined extends T[key]
      ? Component<Exclude<T[key], undefined>> | undefined
      : Component<T[key]>
} & {
  id: ID,
  types: Type[]
};

export type Components = Map<ID, Component<any>>;
export type Types = Map<Type, ID[]>;


export type ID = string;
export type ActorID = string;
export type Type = string;

export type PlayerInterface = {
  actorId: ActorID,
  playerComponent: ID, // A Player is a connection. A Player-Component is the in-game-representation of a Player.
  index: number,
  client: PlayerClient
};

export type ActionProxy<ACTION extends string> = {[key in ACTION]: (...parameters: any[]) => void};

export type LifelessChoice = {
  actor: ActorID,
  actionType: string,
  arguments: ID[]
};

export type Choice = LifelessChoice & {
  execute: () => void
};

export type CallbackableChoice = Choice & {
  callback?: () => void;
}

export type TickHandler = (
  stateDelta: Components,
  choices: Choice[]
) => void;

export interface PlayerClient {
  tickHandler: TickHandler
};

export type AtomicValue = string | number | boolean;
export type AtomicArray = Array<AtomicValue>;
export type Simple<T> = {
  [key in keyof T]: T[key] extends AtomicArray
    ? T[key]
    : T[key] extends AtomicValue
      ? T[key]
      : undefined
};

export type StaticQueryFilter<TARGET> = (engine: GameEngine<any>) => TARGET;
export type QueryFilter<TARGET, SELF = undefined> = {
  get: (engine: GameEngine<any>, self: Component<SELF>) => TARGET
  set?: (engine: GameEngine<any>, self: Component<SELF>, current: TARGET | undefined, next: TARGET) => void
};

// Properties with that name scheme are registered lazily - on first execution, then stay constant!
export type LazyReferenceName = `${string}$`; 

export type Lazy<T> = {
  [key in keyof T]-?: key extends LazyReferenceName 
  ? LazyFunction<T, T[key]>
  : T[key] extends AtomicArray
    ? T[key] | QueryFilter<T[key], T>
    : T[key] extends AtomicValue
      ? T[key] | QueryFilter<T[key], T>
      : T[key] extends Array<infer A>
        ? QueryFilter<Component<A>[], T>
        : undefined extends T[key] // We have a complex type here that needs to resolve to a Component!
          ? QueryFilter<Component<Exclude<T[key], undefined>> | undefined, T>
          : QueryFilter<Component<T[key]>, T>
};

export type LazyFunction<SELF, TARGET> = ((engine: GameEngine<any>, self: Component<SELF>) => TARGET extends AtomicValue 
  ? TARGET
  : TARGET extends Array<infer A>
    ? Component<A>[]
    : Component<TARGET>);

export type Query = string;

export type CacheEntry<T> = {
  timestamp: number,
  result: T,
  func: QueryFilter<T>
};

export type StaticCacheEntry<T> = {
  timestamp: number,
  result: T,
  func: StaticQueryFilter<T>
};