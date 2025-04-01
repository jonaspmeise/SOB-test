import { GameEngine } from './modules/gameengine';
export type DebugState = {
  actions: Action[],
  state: State,
  components: Components,
  types: Types,
  rules: Rule[],
  triggers: Trigger[]
};

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
  R,
  A extends Component,
  B extends (Component | undefined) = undefined
> = {
  name: string,
  execute: (engine: GameEngine, a1?: A, a2?: B) => R,
  log: (appliedParameters: R) => string,
  color?: string
};

export type State = {};
export type Rule = {};
export type Trigger = {};


export type Component = {
  id: ID,
  types: string[]
};

export type Components = Map<string, Component>;
export type Types = Map<string, Type>;


export type ID = `component-${number}`;
export type Type = string;
export type Player = {
  name: string
};