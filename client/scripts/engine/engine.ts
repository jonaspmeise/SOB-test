import { ActionProxy, Choice, Component, Components, ID, PlayerInterface, Type, Types, QueryFilter, Lazy, LazyFunction, CacheEntry, StaticQueryFilter, StaticCacheEntry, Simple } from './types-engine.js';

export class GameEngine<
  ACTION extends string
> {
  private componentCounter: number = 0;
  private changeCounter: number = 0;

  private readonly _components: Simple<Component<unknown>>[] = [];

  private readonly _queries: Map<string, StaticCacheEntry<unknown, Simple<unknown>>> = new Map();
  private readonly _changes: Map<ID, Partial<Simple<Component<unknown>>>> = new Map();

  public registerComponent = <P extends {}> (properties: P, types: Type | Type[], name?: string): Simple<Component<P>> => {
    if(!Array.isArray(types)) {
      types = [types];
    }

    const id: ID = '' + this.componentCounter++;
    console.debug(`Registering component of types "${types}" with ID ${id}...`);

    // Register basic values.
    const proxy: Component<P> = new Proxy(properties, {
      set: (target: P, p: string | symbol, newValue: any) => {
        const prop: string = p.toString();

        this._changes.set(id, {...this._changes.get(id) ?? {}, [prop]: newValue});
        this.changeCounter++;

        target[p] = newValue;

        return true;
      }
    }) as Component<P>;
    proxy.id = id;
    proxy.types = types;

    // Register change and component.
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
  }
}