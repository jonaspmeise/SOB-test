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

export type Action<
  ENTRYPOINT extends {[key: string]: Component<unknown>},
  INPUT_CONTEXT extends {[key: string]: Component<unknown>} = ENTRYPOINT,
  USED_PARAMETERS extends {} = INPUT_CONTEXT
> = {
  name: string,
  execute: (engine: GameEngine, context: Simple<INPUT_CONTEXT>) => Simple<USED_PARAMETERS>,
  context: (engine: GameEngine, entrypoint: Simple<ENTRYPOINT>) => Simple<INPUT_CONTEXT>,
  // The text that is generated _before_ executing this action (descriptor of this action).
  message: (context: Simple<INPUT_CONTEXT>) => string,
  // The text that is generated _after_ executing this action.
  log: (parameters: Simple<USED_PARAMETERS>) => string
};

export type RuleType = 'positive' | 'negative';

export type PositiveRule<ACTION extends Action<any>, PROPERTIES extends {} | undefined = undefined>  = {
  name: string,
  type: 'positive',
  properties?: PROPERTIES,
  handler: (engine: GameEngine, properties: PROPERTIES) => ImplentationChoice<ACTION>[]
};

export type NegativeRule<ACTION extends Action<any>, PROPERTIES extends {} | undefined = undefined> = {
  name: string,
  type: 'negative',
  properties?: PROPERTIES,
  /**
   * 
   * @param chocie The choice to potentially filter out.
   * @param properties Optional properties that make the state of this rule.
   * @returns "true" if the choice is valid, "false" if this rule prevents this choice from being viable.
   */
  handler: (choice: ImplentationChoice<ACTION>, properties: PROPERTIES) => boolean
};

export type Trigger = {
  name: string,
  effect: (engine: GameEngine, actionType: string, parameter: {}) => void
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

export type Component<T> = {
  [key in keyof T]: T[key]
} & {
  id: ID,
  type: Type,
  toJSON: () => unknown,
  toString: () => unknown
};

export type Components = Map<ID, Simple<Component<unknown>>>;

export type ID = string;
export type Identifiable<T> = T & {id: ID};
export type ActorID = string;
export type Type = string;

export type PlayerInterface<T extends Simple<Component<unknown>> | undefined = undefined> = {
  actorId: ActorID,
  // We can link Players to avatars, which are in-game component representations of that player. This is necessary if players can interact within the game with another player (conceptually).
  avatar?: T,
  tickHandler: TickHandler
};

export type ActionProxy<ACTION extends string> = {[key in ACTION]: (...parameters: any[]) => void};

// What the rules generate.
export type ImplentationChoice<ACTION extends Action<any>> = {
  player: PlayerInterface,
  action: ACTION,
  // The entrypoint of this choice - the quintessential information needed to execute this action.
  entrypoint: ACTION extends Action<infer A> ? A : any,
  callback?: () => void
};

// What is persisted within the Game Engine. The details of the reason behind this Action are no longer relevant - only the core execution details are important.
export type InternalChoice = {
  id: string,
  player: PlayerInterface,
  execute: () => void,
  callback?: () => void
}

// What is communicated to the player.
export type CommunicatedChoice = {
  // The Player communicates back to the Engine using this ID that they want to execute this action.
  id: string,
  actionType: string,
  message: string,
  // A simple list of components involved with this Action. This Array is derived from the Context of the Action and can be used by the client to navigate the player in selecting a choice.
  components: ID[]
}

export type TickHandler = (
  stateDelta: Changes,
  choices: CommunicatedChoice[]
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
        ? T[key] // direct references to objects can be held.
        : Simple<T[key]>
};

export type Query<SELF, TARGET> = (self: Simple<SELF>, engine: GameEngine) => Simple<TARGET>;
export type Change<T> = Partial<Simple<Component<unknown>>>;
export type Changes = Map<ID, Partial<Simple<Component<unknown>>>>;