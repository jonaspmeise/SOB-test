import { ActionProxy, Choice, Component, Components, FlatObject, ID, LazyInitializer, PlayerInterface, Type, Types, QueryFilter } from './types-engine.js';

export class GameEngine<
  STATE extends {},
  ACTION extends string
> {
  private componentCounter: number = 0;

  // TEST: No Components -> Error.
  private readonly _components: Component<unknown>[] = [];
  private readonly _idMap: Map<ID, Component<unknown>> = new Map();
  private readonly _types: Types = new Map();
  // TEST: No Players -> Error.
  private readonly _playerInterfaces: PlayerInterface[] = [];
  // TEST: No Actions -> Error.
  // private readonly _actions: {[key: string]: Action<ACTION, any, any>} = {};
  // TEST: No Triggers -> Error.
  // private readonly _triggers: Trigger<any, any>[] = [];
  // TEST: No Rules -> Error.
  // private readonly _rules: Rule<any>[] = [];
  private readonly triggerQueue: (() => void)[] = [];
  private choiceSpace: Choice[] = [];
  private _state: STATE | undefined;

  private isRecording: boolean = false;
  private hasStarted: boolean = false;

  public get components(): ReadonlyArray<Component<unknown>> {
    return this._components;
  };

  public get state(): Readonly<STATE> {
    return this._state!
  }

  /*
  public get types(): Readonly<typeof this._types> {
    return this._types;
  };

  public get playerInterfaces(): Readonly<typeof this._playerInterfaces> {
    return this._playerInterfaces;
  };
  
  public get triggers(): Readonly<typeof this._triggers> {
    return this._triggers;
  };
  
  public get rules(): Readonly<typeof this._rules> {
    return this._rules;
  };

  // TEST: Can't register component with same name multiple times.
  // TEST: Make Properties have specific formats depending on Type, so that integrity is checked during runtime (e.g.: $__ => reference, __$ => callable, _ => possibly undefined)
  // TEST: An Registered Array still has Prototype Array. An registered Object has Prototype of its prior Object.

  */
  public registerComponent = <P, L extends LazyInitializer<P>> (properties: L, types: Type | Type[], name?: string): P => {
    if(!Array.isArray(types)) {
      types = [types];
    }

    const id: ID = '' + this.componentCounter++;
    console.debug(`Registering component of types "${types}" with ID ${id}...`);
    
    // FIXME: Simple test!
    // @ts-ignore FIXME
    const modified: Component<P> = properties as Component<P>;

    // Explicitly set values here so we don't change an Array to an Object by accident!
    if(name !== undefined) {
      modified.toString = () => name;
    };
    modified.id = id;
    modified.types = types;

    const proxy = new Proxy(properties, {
      get: (target: L, prop: string | Symbol) => {
        console.log(`Accessed ${prop} of`, target);

        if(typeof prop === 'symbol') {
          console.error(`WTF!!!!`);
          console.error(prop);
        }

        return target[prop as string];
      }
    }) as unknown as Component<P>;

    // Update reference maps.
    this._idMap.set(id, proxy);
    this._components.push(proxy);

    /*
    types.forEach(type => {
      this._types.set(type, [...(this.types.get(type) ?? []), id]);
    });
    */

    return modified;
  };

  /*
  // TEST: Can't register same Action multiple times.
  public registerAction = <T extends ACTION> (action: Action<T, any, any>): void => {
    this._actions[action.name] = action;
  };

  // TEST: Can't register same Player multiple times.
  public registerPlayerInterface = (player: PlayerInterface): PlayerInterface => {
    this._playerInterfaces.push(player);

    return player;
  };

  public registerRule = (rule: Rule<ACTION>): void => {
    this._rules.push(rule);
  };

  public registerTrigger = (trigger: Trigger<any>): void => {
    this._triggers.push(trigger);
  };

  public get actions(): ActionProxy<ACTION> {
    return new Proxy(this._actions, {
      get: (target, prop: string, _receiver) => {
        const response = target[prop];

        // Automatically execute logging on action execution.
        return new Proxy(response.execute, {
          apply: (target, thisArg, argArray) => {

            console.debug(`Called action ${prop} with raw components`, argArray);

            // References inside the arguments need to be translated to real components!
            const mappedArray = [
              this,
              // TODO: What about explicit, non-typed parameters...? like "amount", "value", ...
              ...argArray.map(arg => this.components.get(arg))
            ];
            console.debug(`Executing action "${prop}" with parameters`, mappedArray);

            const usedParameters = target.apply(thisArg, mappedArray as [engine: this]);
            log(response.log(usedParameters));

            // Add trigger for this action to trigger 
            const createdTriggers = this._triggers
              .filter(trigger => trigger.actions.length == 0 || trigger.actions.includes(prop))
              .map(
                trigger => trigger.effect(this, prop, usedParameters)
              ).flat();

            console.debug(`Creating ${createdTriggers.length} triggers.`);

            // Make the trigger an executable
            this.triggerQueue.push(...createdTriggers);

            this.tick();
          }
        });
      }
    }) as unknown as ActionProxy<ACTION>;
  }

  public tick = (depth = 0) => {
    console.debug('Tick triggered.');

    // Calculate action space for both playerInterfaces.
    // TODO: Right now, the action space is re-calculated greedily.
    this.choiceSpace = this._rules
      .map(rule => rule.handler(this, rule.properties))
      .flat()
      .map(choice => {
        return {
          ...choice,
          execute: () => {
            // We overwrite the existing choice with a potential callback proxy!
            if(choice.callback !== undefined) {
              choice.callback();
            }
            choice.execute();
          }
        };
      });

    // Work off triggers.
    const trigger = this.triggerQueue.pop();
    if(trigger !== undefined) {
      console.log('Resolving trigger', trigger, 'Remaining Triggers:', this.triggerQueue);

      trigger();

      // TODO: Trigger a re-evaluation...?
      this.tick(depth + 1);
    }

    // Only all triggers "returned", do some UI QoL.
    // Only update Views for playerInterfaces once the game is started - aka, is launched!
    if(depth == 0 && this.started) {
      console.info('Current choice space:', this.choiceSpace);
      // Register this game with the view of each player.
      this._playerInterfaces.forEach(player => {
        player.client.tickHandler(
          // TODO: Only visible components to each player!
          this.components,
          this.choices(player)
        );
      });
    }
  };
  
  private choices = (player: PlayerInterface | undefined): typeof this.choiceSpace => {
    if(player === undefined) {
      return this.choiceSpace;
    }

    return this.choiceSpace.filter(choice => choice.actor === player.actorId);
  }

  */
  // Main Game Loop.
  public start = () => {
    console.debug('Game is starting!');
    this.hasStarted = true;

    // this.tick();
  };

  // Records a Query and updates it once any of the "touched" components & its properties change!
  public record = <T>(func: (...args: unknown[]) => T): T => {
    this.isRecording = true;
    const value = func();
    this.isRecording = false;

    return value;
  };
}