import { ActionProxy, Choice, Component, Components, ID, PlayerInterface, Type, Types, QueryFilter, Lazy, LazyFunction } from './types-engine.js';

export class GameEngine<
  ACTION extends string
> {
  private componentCounter: number = 0;
  private queryCounter: number = 0;

  private queryIncantations: string[] = [];
  public _proxy = new Proxy(this, {
    get: (target: typeof this, prop: string | symbol, receiver: any) => {
      const t = target[prop];

      // Track access if in record mode.
      if(!this.isRecording) {
        return t;
      }

      // If it is a function, we keep track of that function.
      if(typeof t === 'function' && prop === 'query') {
        return new Proxy(t, {
          apply: (target: any, thisArg: any, args: any[]) => {
            console.warn(`CALLED function ${prop.toString()} with parameters:`, args);
            this.queryIncantations.push(args[0]);
  
            return target.apply(thisArg, args);
          }
        });
      }

      console.warn(`"${prop.toString()}" (${typeof t}) of Game Engine was called!`);

      return t;
    }
  });

  // TEST: No Components -> Error.
  private readonly _components: Component<unknown>[] = [];
  private readonly _idMap: Map<ID, Component<unknown>> = new Map();
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
  private _changeMap: Map<ID, {[key: string]: unknown}> = new Map();

  private isRecording: boolean = false;
  private hasStarted: boolean = false;
  private _queryResults: Map<string, Component<unknown>[]> = new Map();
  private queryExecutors: Map<string, QueryFilter<unknown, unknown>> = new Map();
  private lazyPropertiesToInitialize: {target: Component<unknown>, prop: string, func: LazyFunction<any, unknown>}[] = [];
  private typeCallbacks: Map<string, {target: Component<unknown>, prop: string, func: Function}[]> = new Map();

  public get components(): ReadonlyArray<Component<unknown>> {
    return this._components;
  };

  /*
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
  public registerComponent = <P, L extends Lazy<P>> (properties: L, types: Type | Type[], name?: string): Component<P> => {
    if(!Array.isArray(types)) {
      types = [types];
    }

    const id: ID = '' + this.componentCounter++;
    console.debug(`Registering component of types "${types}" with ID ${id}...`);
    
    // @ts-ignore FIXME
    const modified: Component<P> = properties as Component<P>;

    // We track all current states of query properties of our object.
    const queryObjects: Map<string, boolean> = new Map();
    // Tracks whether our own query was dirtied during the last execution.
    const queryDirty: Map<string, boolean> = new Map();
    // TODO: Track internal map of property -> Set<callbacks>. Adaptively populate this map.
    // Access to query-properties should BY DEFAULT always go through here anyhow.
    let proxyHandler = {};
    const proxy = new Proxy(modified, proxyHandler);
    proxyHandler = {
      set: (target, prop: string | symbol, value: unknown) => {
        console.warn('Set', prop.toString());
        let changes = this._changeMap.get(modified.id);

        if(changes === undefined) {
          changes = {};
          this._changeMap.set(modified.id, changes);
        }

        // TODO: Changes if target is an Array?
        this._changeMap.set(modified.id, {...changes, [prop]: value});
        target[prop] = value;

        return true;
      },
      get: (target, prop) => {
        const p = prop.toString();
        console.warn('Get', p);

        if(p.startsWith('$')) {
          console.warn('QUERY ACCESSED', p);

          if(queryDirty.get(p) === true) {
            return queryObjects.get(p);
          }

          if(queryDirty.get(p) ?? true) {
            console.debug(`Query "${p}" of Component #${id} was dirtied. Need to re-calculate...`);

            queryObjects.set(p, target[prop](this._proxy, proxy));
            queryDirty.set(p, false);
          }

          // Whenever another property is modified during the execution of this query, we should be informed!
          // this._globalCallback = 

          return queryObjects.get(prop.toString());
        }

        return target[prop];
      }
    };

    // Explicitly set values here so we don't change an Array to an Object by accident!
    if(name !== undefined) {
      modified.toString = () => name;
    };
    modified.id = id;
    modified.types = types;
    
    // We prematurely register this - outer references are registered first then.
    this._idMap.set(id, modified);
    this._components.push(modified);

    // Initialize all of the lazy and query properties.
    Object.entries(modified).forEach(([key, value]) => {
      if(typeof value !== 'function') {
        return;
      }

      if(!key.startsWith('$')) {
        // Lazy Function - initialize when the game starts.
        console.debug(`Handling "${key}" as a lazy property of Component #${id}...`);
        this.lazyPropertiesToInitialize.push({
          target: modified,
          prop: key,
          func: (value as LazyFunction<typeof modified, typeof value>)
        });
      } else {
        // TODO: Only initialize on first touch!
        // Query Function - initialize directly!
        let accessedSelfProperties: string[] = [];
        const selfProxy = new Proxy(modified, {
          get: (target: Component<P>, prop: string | symbol, receiver: any) => {
            accessedSelfProperties.push(prop.toString());
            return target[prop];
          }
        });

        // TODO: Make this smoother!
        // TODO: Recording is only set for the context of potential query(...) calls. Not for the proxy component itself!
        this.isRecording = true;
        modified[key] = (value as QueryFilter<unknown, unknown>)(this._proxy, proxy);
        this.isRecording = false;

        this.queryIncantations.forEach(incantation => {            
          // The QueryFilter called our engine's internal query-method!
          // So, we have to register a callback for this method - whenever a new component with that type is created, we need to inform this property about it.

          if(!this.typeCallbacks.has(incantation)) {
            // Register it initially.
            this.typeCallbacks.set(incantation, []);
          }

          this.typeCallbacks.get(incantation)!.push({
            target: modified,
            prop: key,
            func: () => (value as QueryFilter<unknown, unknown>)(this._proxy, modified)
          })
        });
        // Reset for next call!
        this.queryIncantations = [];
      }
    });

    types.forEach(type => {
      let query = this.queryExecutors.get(type);

      if(query === undefined) {
        query = (engine) => engine._components
          .filter(c => c.types.includes(type));

        this.queryExecutors.set(type, query);
      }
      
      // Initialize query executor once. No proxy needed, because we are the only ones tracking this!
      const result = query(this, modified);

      this._queryResults.set(
        type,
        Array.isArray(result) ? result : [result]
      );

      // The creation of this component might cause another query to update, because it has a query filter pointing to types of this object.
      // For this case, we need to manually handle this - but that's okay!
      const callbacks = this.typeCallbacks.get(type);

      if(callbacks !== undefined) {
        console.debug(`Creation of Component with Type "${type}" causes ${callbacks.length} queries of other Components to update. Updating...`);

        callbacks.forEach(callback => {
          callback.target[callback.prop] = callback.func();
        });
      }
    });

    /*
    const proxy = new Proxy(properties, {
      get: (target: L, prop: string | Symbol) => {
        console.debug(`Accessed ${prop.toString()} of`, target);

        if(typeof prop === 'symbol') {
          console.error(`WTF!!!!`);
        }

        return target[prop as unknown as string];
      }
    }) as unknown as Component<P>;
    */

    // Update reference maps.

    return proxy;
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
    console.info(`Resolving all ${this.lazyPropertiesToInitialize} lazy parameters....`);

    this.lazyPropertiesToInitialize.forEach(call => {
      console.debug(`Resolving lazy reference of ${call.target.id}: "${call.prop}"...`);
      call.target[call.prop] = call.func(call.target, this);
    });

    this.hasStarted = true;

    // this.tick();
  };

  public query = <T> (queryName: string): Component<T>[] => {
    return this._queryResults.get(queryName) as Component<T>[] ?? [];
  };

  // TEST: No queries can be overwritten.
  public registerQuery = <T> (name: string, func: QueryFilter<T, unknown>): void => {
    this.queryExecutors.set(name, func);
  };

  public changes = (): ReadonlyMap<ID, {[key: string]: unknown}> => {
    return this._changeMap;
  }
}