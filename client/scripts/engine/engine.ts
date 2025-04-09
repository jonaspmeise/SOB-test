import { ActionProxy, Choice, Component, Components, ID, PlayerInterface, Type, Types, QueryFilter, Lazy, LazyFunction, CacheEntry, StaticQueryFilter, StaticCacheEntry, Simple } from './types-engine.js';

export class GameEngine<
  ACTION extends string
> {
  private componentCounter: number = 0;
  private changeCounter: number = 0;

  private readonly _components: Simple<Component<unknown>>[] = [];

  private static FUNCTIONS_TO_IGNORE: Set<string> = new Set<string>()
    .add('indexOf')
    .add('toJSON');

  private readonly _queries: Map<string, StaticCacheEntry<unknown, Simple<unknown>>> = new Map();
  private readonly _changes: Map<ID, Partial<Simple<Component<unknown>>>> = new Map();

  public registerComponent = <P extends {}> (properties: P, types: Type | Type[], name?: string): Simple<Component<P>> => {
    if(!Array.isArray(types)) {
      types = [types];
    }

    const id: ID = '' + this.componentCounter++;
    console.debug(`Registering component of types "${types}" with ID ${id}...`);

    // We check for nested objects inside the given object.
    Object.entries(properties).forEach(([key, value]) => {
      // TODO: Might need array here too!
      if(typeof value === 'object') {
        // We register this as a separate, anonymous object.
        console.debug(`Registering nested object in property ${key} as an anonymous entity...`);
        properties[key] = this.registerComponent(value as Object, 'anonymous');
      }
    });

    const cache: Map<string, CacheEntry<unknown>> = new Map();
    // Register basic values.
    const proxy: Component<P> = new Proxy(properties, {
      set: (target: P, p: string | symbol, newValue: any) => {
        const prop: string = p.toString();

        if(typeof target[p] === 'function') {
          throw new Error(`Can't set a value to the property "${prop}" of Component with Types "${types}" because it's a query attribute!`);
        }

        this._changes.set(id, {...this._changes.get(id) ?? {}, [prop]: newValue});
        this.changeCounter++;

        target[p] = newValue;

        return true;
      },
      get: (t: P, p: string | symbol) => {
        const prop: string = p.toString();
        const target = t[p];

        if(typeof target === 'function') {
          // Some in-built Array-functions aside, we can assume that it's a query.
          if(GameEngine.FUNCTIONS_TO_IGNORE.has(prop)) {
            console.debug(`Not proxying function access to function ${prop}...`);
            return target;
          }

          // We try and access a query. 
          // We automatically execute it using our cache and then return the value.

          const entry = cache.get(prop);

          if(entry === undefined) {
            // Fill cache initially.
            console.debug(`Cache is empty for property "${prop}" on Component #${id}. Initializing...`);
            const result = target(proxy, this);
            cache.set(prop, {
              func: target,
              timestamp: this.changeCounter,
              result: result
            });

            return result;
          } else {
            if(entry.timestamp >= this.changeCounter) {
              console.debug(`Property "${prop}" is still cached. Retrieving...`);

              return entry.result;
            } else {
              console.debug(`Updating property cache for "${prop}" because timestamps differ: ${entry.timestamp} < ${this.changeCounter}`);
              
              const result = target(proxy, this);
              cache.set(prop, {
                func: target,
                timestamp: this.changeCounter,
                result: result
              });

              return result;
            }
          }
        }

        return target;
      }
    }) as Component<P>;
    proxy.id = id;
    proxy.types = types;
    proxy.toJSON = () => {
      console.debug('Calling toJSON on', id);
      const json = {};
      for(let key in proxy) {
        const target = proxy[key];
        console.debug('----', key);
        // Default case.
        // Functions are ignored.
        if(typeof target === 'function') {
          continue;
        }

        if(typeof target !== 'object') {
          json[key] = proxy;
          continue;
        }
        
        console.debug('A');
        console.debug(Object.keys(proxy));
        console.debug('B');
        console.debug(`Masking reference to other component in property "${key}" (${typeof target}) of Component with Types ${types}...`);
        console.debug('C');
        // Exclude references to other Entities!
        json[key] = `@${target.id}`;
        console.debug('D');
      }

      return json;
    }

    // Register change and component. We use proxy values here because these values can be interacted with from the "outside" world.
    this._components.push(proxy);

    this._changes.set(id, {...proxy});
    this.changeCounter++;

    // Automatically register a query for these types!
    types.forEach(type => {
      this.registerQuery(
        type,
        (engine) => engine.components().filter(component => component.types.includes(type))
      );
    });

    return proxy as Simple<Component<P>>;
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

    // this.tick();
  };

  public query = <T> (queryName: string): Simple<Component<T>>[] => {
    const entry = this._queries.get(queryName);

    if(entry === undefined) {
      console.warn(`Query "${queryName}" does not exist!`);

      return [];
    }

    if(entry.timestamp >= this.changeCounter) {
      console.debug(`Query "${queryName}" is still cached. Retrieving...`);
      return entry.result as Simple<Component<T>>[];
    }

    console.debug(`Updating content of query "${queryName}"...`);
    const newValue = entry.func(this);

    this._queries.set(queryName, {
      func: entry.func,
      timestamp: this.changeCounter,
      result: newValue
    })

    return newValue as Simple<Component<T>>[];
  };

  // TEST: No queries can be overwritten.
  public registerQuery = (name: string, func: StaticQueryFilter<Simple<Component<unknown>>[]>): void => {
    this._queries.set(name, {
      result: func(this),
      timestamp: this.changeCounter,
      func: func
    });
  };

  public changes = (): ReadonlyMap<ID, Partial<Simple<Component<unknown>>>> => {
    return this._changes;
  };

  public queries = (): ReadonlyArray<string> => {
    return Array.from(this._queries.keys());
  };

  public components = (): ReadonlyArray<Simple<Component<unknown>>> => {
    return this._components;
  };
}