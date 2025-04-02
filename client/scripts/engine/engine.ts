import { Action, ActionProxy, Choice, Component, ID, Player, RawPlayer, Trigger, Type } from './types-engine';
import { log } from './utility';

export class GameEngine<
  STATE extends {},
  ACTION extends string
> {
  private componentCounter: number = 0;

  public constructor(private readonly _state: STATE) {}

  // TODO: Proxy around this!
  public get state(): STATE {
    return this._state;
  }

  private readonly _components: Map<ID, Component> = new Map();
  private readonly _types: Map<Type, ID[]> = new Map();
  private readonly _players: Player[] = [];
  private readonly _actions: {[key: string]: Action<ACTION, any, any>} = {};
  private readonly _triggers: Trigger<any, any>[] = [];
  private readonly triggerQueue: (() => void)[] = [];
  private choiceSpace: Choice[] = [];

  public get components(): Readonly<typeof this._components> {
    return this._components;
  };

  public get types(): Readonly<typeof this._types> {
    return this._types;
  };

  public get players(): Readonly<typeof this._players> {
    return this.players;
  };

  // TEST: Can't register component with same name multiple times.
  public registerComponent = <T> (properties: T, types: Type | Type[], name: string): {
    id: ID,
    types: Type[],
    toString : () => string
  } & T => {
    if(!Array.isArray(types)) {
      types = [types];
    }

    const id: ID = this.componentCounter++;
    console.debug(`Registering component of types "${types}" with ID ${id}...`);
    
    const modified = {
      ...properties,
      id: id,
      types: types
    };

    modified.toString = () => name;

    // Update reference maps.
    this._components.set(id, modified);

    types.forEach(type => {
      this._types.set(type, [...(this.types.get(type) ?? []), id]);
    });

    return modified;
  };

  // TEST: Can't register same Action multiple times.
  public registerAction =<T extends ACTION> (action: Action<T, any, any>): void => {
    this._actions[action.name] = action;
  };

  // TEST: Can't register same Player multiple times.
  public registerPlayer = (player: RawPlayer): void => {
    this._players.push(player);
  };

  public get actions(): ActionProxy<ACTION> {
    return new Proxy(this._actions, {
      get: (target, prop: string, _receiver) => {
        const response = target[prop];

        // Automatically execute logging on action execution.
        return new Proxy(response.execute, {
          apply: (target, thisArg, argArray) => {

            // References inside the arguments need to be translated to real components!
            console.debug(`Executing action ${prop} with components ${argArray}`);
            const mappedArray = [
              this,
              ...argArray.map(arg => {
                if(typeof arg != "number") {
                    return arg;
                }

                return this.components.get(arg);
              })
            ];

            const usedParameters = target.apply(thisArg, mappedArray as [engine: this]);

            // Reset handle context after action has been executed.
            this.resetHandleContext();
            log(response.log(usedParameters));

            // Add trigger for this action to trigger 
            console.debug(`Creating ${this._triggers.length} triggers.`);

            // Make the trigger an executable
            this.triggerQueue.push(...this._triggers.map(
              trigger => (() => trigger.effect(prop, usedParameters, state))
            ));

            this.tick();
          }
        });
      }
    }) as unknown as ActionProxy<ACTION>;
  }

  public resetHandleContext = () => {

  };

  public tick = () => {

  };
  
  public choices = (player: Player | undefined): Readonly<typeof this.choiceSpace> => {
    if(player === undefined) {
      return this.choiceSpace;
    }

    return this.choiceSpace.filter(choice => choice.actor === player.id);
  }
}