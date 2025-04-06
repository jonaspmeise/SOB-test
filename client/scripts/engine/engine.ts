import { ActionProxy, Choice, Component, Components, ID, PlayerInterface, Type, Types, QueryFilter, Lazy, LazyFunction, CacheEntry, StaticQueryFilter, StaticCacheEntry } from './types-engine.js';

export class GameEngine<
  ACTION extends string
> {
  private componentCounter: number = 0;
  private queryCounter: number = 0;
  private changeCounter: number = 0;

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
  private _queries: Map<string, StaticCacheEntry<unknown>> = new Map();

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

    // We cache all current states of query properties of our object.
    const queryCache: Map<string, {
      obj: unknown,
      lastChanged: number
    }> = new Map();
    // TODO: Track internal map of property -> Set<callbacks>. Adaptively populate this map.
    // Access to query-properties should BY DEFAULT always go through here anyhow.
    const proxy = new Proxy(modified, {
      set: (target: typeof modified, prop: string | symbol, value: unknown) => {
        console.warn('Set', prop.toString());
        let changes = this._changeMap.get(modified.id);

        if(changes === undefined) {
          changes = {};
          this._changeMap.set(modified.id, changes);
        }

        // TODO: Changes if target is an Array?
        this._changeMap.set(modified.id, {...changes, [prop]: value});
        this.changeCounter++;

        target[prop] = value;

        return true;
      },
      get: (target: typeof modified, prop: string | symbol) => {
        const p = prop.toString();
        console.debug('Get', p);

        if(typeof target[prop] !== 'function') {
          return target[prop];
        }

        console.debug('QUERY ACCESSED', p);

        const cacheHit = queryCache.get(p);
        if(cacheHit !== undefined && cacheHit.lastChanged >= this.changeCounter) {
          console.debug('Cache Hit successful!');
          return cacheHit.obj;
        }

        console.debug(`Query "${p}" of Component #${id} has seen an old state. Need to re-calculate...`);

        const result = target[prop](this._proxy, proxy);
        queryCache.set(p, {lastChanged: this.changeCounter, obj: result});

        return result;
      }
    });

    // Explicitly set values here so we don't change an Array to an Object by accident!
    if(name !== undefined) {
      modified.toString = () => name;
    };
    modified.id = id;
    modified.types = types;

    // Trigger all lazy functions here!
    Object.keys(modified).forEach(key => {
      if(key.endsWith('$')) {
        modified[key] = (modified[key] as QueryFilter<unknown, P>)(this, proxy);
      }
    });

    // Register accesses.
    this._idMap.set(id, proxy);
    this._components.push(proxy);

    // Create automatic queries for all of this types!
    types.forEach(type => {
      this._queries.set(type, {
        result: this.components.filter(c => c.types.includes(type)),
        timestamp: this.changeCounter,
        func: (engine) => engine.components.filter(c => c.types.includes(type))
      });
    });

    // Add change entry for this, because this component was just created.
    this.changeCounter++;
    this._changeMap.set(id, {...proxy});

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

    this.hasStarted = true;

    // this.tick();
  };

  public query = <T> (queryName: string): Component<T>[] => {
    const entry = this._queries.get(queryName);

    if(entry === undefined) {
      return [];
    }

    if(entry.timestamp >= this.changeCounter) {
      return entry.result as Component<T>[];
    }

    console.debug(`Updating content of query "${queryName}"...`);
    const newValue = entry.func(this);

    this._queries.set(queryName, {
      func: entry.func,
      timestamp: this.changeCounter,
      result: newValue
    })

    return newValue as Component<T>[];
  };

  // TEST: No queries can be overwritten.
  public registerQuery = <T> (name: string, func: StaticQueryFilter<T>): void => {
    this._queries.set(name, {
      result: func(this),
      timestamp: this.changeCounter,
      func: func
    });
  };

  public changes = (): ReadonlyMap<ID, {[key: string]: unknown}> => {
    return this._changeMap;
  }
}