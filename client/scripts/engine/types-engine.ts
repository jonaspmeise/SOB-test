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
  execute: (engine: GameEngine<any, any>, a1?: A, a2?: B) => R,
  log: (appliedParameters: R) => string,
  color?: string
};

export type Rule = {};
/*
{
    name: 'Start of your Turn, you draw a Card.',
    check: (actionType, args, model) => {
      return (actionType === 'pass');
    },
    effect: (actionType, args, model) => {
      // Identical to the returned parameters from the action 'pass'!
      const newPlayer = args[1];

      if(newPlayer.deck$.length > 0) {
        actions.draw(newPlayer.deck$.id);
      }
      
      return [actionType, args, model];
    }
  },
*/

export type TriggerTiming = 'before' | 'after';

export type Trigger<A extends Action<any, any, any, any> | unknown, B extends (A extends Action<any, any, any, any> ? ReturnType<A['execute']> : unknown)> = {
  name: string,
  actions: string[], // if undefined, then it's called for all actions!
  timing: TriggerTiming // whether to call the trigger before the state initialization (TODO: to potentially prevent certain actions...?) or after (reactive).
  // TODO: Add args and model (or state / actions...?)
  effect: (engine: GameEngine<any, any>, actionType: A, parameter: B) => (() => void)[]
};

export type TriggerExecution<
  T extends Trigger<any, any>
> = {
  name: T['name'],
  execution: () => void
};


export type Component = {
  id: ID,
  types: string[]
};

export type Components = Map<string, Component>;
export type Types = Map<string, Type>;


export type ID = number;
export type Type = string;
export type RawPlayer = {
  name: string
};

export type Player = RawPlayer & Component;

export type ActionProxy<ACTION extends string> = {[key in ACTION]: (...parameters: any[]) => void};

export type Choice = {
  actor: ID
};