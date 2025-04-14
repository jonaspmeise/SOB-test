import { GameEngine } from "./engine.js";

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

export type PositiveRule<ACTION extends Action<any>, PROPERTIES extends ({} | undefined) = undefined> = {
  id: string,
  name: string,
  type: 'positive',
  properties?: PROPERTIES,
  handler: (engine: GameEngine, properties: PROPERTIES) => ImplentationChoice<ACTION>[],
  callback?: (engine: GameEngine, properties: PROPERTIES) => void
};

export type NegativeRule<ACTION extends Action<any>, PROPERTIES extends ({} | undefined) = undefined> = {
  id: string,
  name: string,
  type: 'negative',
  properties?: PROPERTIES,
  /**
   * 
   * @param chocie The choice to potentially filter out.
   * @param properties Optional properties that make the state of this rule.
   * @returns "true" if the choice is valid, "false" if this rule prevents this choice from being viable.
   */
  handler: (choice: ImplentationChoice<Action<any>>, properties: PROPERTIES) => boolean
};

export type Trigger = {
  name: string,
  actionTypes?: string[],
  execute: (engine: GameEngine, actionType: string, context: {}) => (() => void)[]
};

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

export type PlayerInterface<T extends Component<unknown> | undefined = undefined> = {
  actorId: ActorID,
  // We can link Players to avatars, which are in-game component representations of that player. This is necessary if players can interact within the game with another player (conceptually).
  avatar?: Simple<T>,
  tickHandler: TickHandler
};

// What the rules generate.
export type ImplentationChoice<ACTION extends Action<any>> = {
  player: PlayerInterface<any>,
  action: ACTION,
  // The entrypoint of this choice - the quintessential information needed to execute this action.
  entrypoint: ACTION extends Action<infer A> ? A : any
};

// What is persisted within the Game Engine. The details of the reason behind this Action are no longer relevant - only the core execution details are important.
export type InternalChoice<T extends Action<any, any>> = {
  id: string,
  actionType: T['name'],
  context: T['context'],
  player: PlayerInterface<any>,
  execute: () => void,
  callback?: (engine: GameEngine, context: T['context']) => void
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

export type Callbackable<T> = T & {
  callback?: (engine: GameEngine, properties: any) => void
};