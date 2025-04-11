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

export type Action<INPUT_PARAMETERS extends {}, USED_PARAMETERS extends {} = INPUT_PARAMETERS> = {
  name: string,
  execute: (engine: GameEngine, parameters: INPUT_PARAMETERS) => USED_PARAMETERS,
  log: (usedParameters: USED_PARAMETERS) => string
};

export type Rule<T extends {} | undefined = undefined> =
  | PositiveRule<T>
  | NegativeRule<T>;

export type RuleType = 'positive' | 'negative';

export type PositiveRule<T extends {} | undefined = undefined>  = {
  name: string,
  type: 'positive',
  properties?: T,
  handler: (engine: GameEngine, properties: T) => ChoiceImplementation[]
};

export type NegativeRule<T extends {} | undefined = undefined> = {
  name: string,
  type: 'negative',
  properties?: T,
  /**
   * 
   * @param chocie The choice to potentially filter out.
   * @param properties Optional properties that make the state of this rule.
   * @returns "true" if the choice is valid, "false" if this rule prevents this choice from being viable.
   */
  handler: (choice: ChoiceImplementation, properties: T) => boolean
};

/*

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

export type Component<T> = T & {
  id: ID,
  type: Type,
  toJSON: () => unknown,
  toString: () => unknown
};

export type Components = Map<ID, Simple<Component<unknown>>>;

export type ID = string;
export type ActorID = string;
export type Type = string;

export type PlayerInterface<T extends Simple<Component<unknown>> | undefined = undefined> = {
  actorId: ActorID,
  // We can link Players to avatars, which are in-game component representations of that player. This is necessary if players can interact within the game with another player (conceptually).
  avatar?: T,
  tickHandler: TickHandler
};

export type ActionProxy<ACTION extends string> = {[key in ACTION]: (...parameters: any[]) => void};

export type PlayerChoice<T extends {} | unknown = unknown> = {
  id: string,
  actionType: string,
  context: T
};

export type ChoiceImplementation<T extends {} | unknown = unknown> = {
  player: PlayerInterface,
  actionType: string,
  // The context of this choice - this has nothing to do with the choice itself (or its implementation), but gives the player context on with what components this choice interacts!
  context: T,
  execute: () => void,
  callback?: () => void
};

export type TickHandler = (
  stateDelta: Changes,
  choices: PlayerChoice<unknown>[]
) => void;

export interface PlayerClient {
  tickHandler: TickHandler
};

export type AtomicValue = string | number | boolean;
export type AtomicArray = Array<AtomicValue>;

export type StaticQueryFilter<TARGET> = (component: GameEngine) => TARGET;
export type QueryFilter<TARGET, SELF = undefined> = {
  get: (engine: GameEngine, self: Component<SELF>) => TARGET
  set?: (engine: GameEngine, self: Component<SELF>, current: TARGET | undefined, next: TARGET) => void
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

export type LazyFunction<SELF, TARGET> = ((engine: GameEngine, self: Component<SELF>) => TARGET extends AtomicValue 
  ? TARGET
  : TARGET extends Array<infer A>
    ? Component<A>[]
    : Component<TARGET>);

export type CacheEntry<T> = {
  timestamp: number,
  result: T,
  func: QueryFilter<T>
};

export type StaticCacheEntry<A, B extends Simple<A>> = {
  timestamp: number,
  result: B,
  func: StaticQueryFilter<B>
};

export type Simple<T> = {
  [key in keyof T]: undefined extends T[key]
    ? T[key] extends Query<any, infer A>
      ? Simple<Exclude<A, undefined>>[] | undefined
      : Simple<Exclude<T[key], undefined>> | undefined
    : T[key] extends Query<any, infer A>
      ? A extends Array<infer B>
        ? Simple<B>[]
        : Simple<A>
      : key extends ('toJSON' | 'toString') // We ignore built-in functions.
        ? T[key]
        : Simple<T[key]>
};

export type Query<SELF, TARGET> = (self: Simple<SELF>, engine: GameEngine) => Simple<TARGET>;
export type Change<T> = Partial<Simple<Component<unknown>>>;
export type Changes = Map<ID, Partial<Simple<Component<unknown>>>>;