import { GameEngine } from "./engine";

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


export type Component = {
  id: ID,
  types: Type[]
};

export type Components = Map<ID, Component>;
export type Types = Map<Type, ID[]>;


export type ID = string;
export type ActorID = string;
export type Type = string;

export type Player = {
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