import { isThisTypeNode } from 'typescript';
import { Component, Components, ID, PlayerInterface, Type, CacheEntry, StaticQueryFilter, StaticCacheEntry, Simple, Changes, Action, PositiveRule, NegativeRule, RuleType, InternalChoice, ImplentationChoice, Identifiable, Trigger, CommunicatedChoice, Callbackable } from './types-engine.js';
import { jsonify, prepareMapForExport } from './utility.js';

export class GameEngine {
  private componentCounter: number = 0;
  private changeCounter: number = 0;

  private readonly _components: Simple<Component<unknown>>[] = [];
  private readonly _componentMap: Components = new Map();

  private static FUNCTIONS_TO_IGNORE: Set<string> = new Set<string>()
    .add('indexOf')
    .add('toJSON')
    .add('toString')
    .add('constructor');

  private readonly _queries: Map<string, StaticCacheEntry<unknown, Simple<unknown>>> = new Map();
  private readonly _changes: Changes = new Map();
  private readonly _playerInterfaces: PlayerInterface[] = [];
  private readonly _actions: Map<string, Action<any, any>> = new Map();

  // TRIGGERS
  private readonly _triggers: Map<string, Trigger> = new Map();
  private readonly _genericTriggers: Trigger[] = [];
  private readonly _specificTriggers: Map<string, Trigger[]> = new Map();

  private readonly _rules: Map<string, PositiveRule<any> | NegativeRule<any>> = new Map();
  private readonly _positiveRules: Map<string, PositiveRule<any>> = new Map();
  private readonly _negativeRules: Map<string, NegativeRule<any>> = new Map();

  private readonly _choices: Map<string, InternalChoice<any>> = new Map();
  
  private _started = false;

  public registerComponent = <P extends {}> (properties: P, type: Type, name?: string): Simple<Component<P>> => {
    const id: ID = '' + this.componentCounter++;
    console.debug(`Registering component of type "${type}" with ID ${id}...`);

    // We check for nested objects inside the given object.
    Object.entries(properties).forEach(([key, value]) => {
      // TODO: Might need array here too!
      if(typeof value === 'object') {
        // We register this as a separate, anonymous object - if it is not registered yet!
        const otherId = (value as {id?: ID})?.id;
        console.debug(`Nested Object is already registered? ID = ${otherId}`);
        if(otherId !== undefined) {
          if(this._componentMap.has(otherId)) {
            console.debug(`Component #${otherId} was already registered! Not registering again...`);
            return;
          }
        }

        console.debug(`Registering nested object in property ${key} as an anonymous entity...`);
        properties[key] = this.registerComponent(value as Object, 'anonymous');
      }
    });

    const cache: Map<string, CacheEntry<unknown>> = new Map();
    // Register basic values.
    const proxy: Component<P> = new Proxy(properties, {
      set: (target: P, p: string | symbol, newValue: any) => {
        const prop: string = p.toString();
        console.debug(`Setting "${prop}" on Component #${id} (${type})...`);

        if(typeof target[p] === 'function' && !GameEngine.FUNCTIONS_TO_IGNORE.has(prop)) {
          throw new Error(`Can't set a value to the property "${prop}" of Component with Type "${type}" because it's a query attribute!`);
        }

        this._changes.set(id, {
          ...this._changes.get(id) ?? {},
          [prop]: newValue
        });

        target[p] = newValue;

        // Trigger another tick, since state was changed!
        this.tick();
        
        return true;
      },
      get: (t: P, p: string | symbol) => {
        const prop: string = p.toString();
        const target = t[p];

        console.debug(`Accessing ${prop} of Component #${id}`);

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

    // Initializing default behaviors.
    proxy.id = id;
    proxy.type = type;
    proxy.toJSON = () => jsonify(proxy);
    proxy.toString = () => name ?? `Component #${id} (${type})`;

    // Register change and component. We use proxy values here because these values can be interacted with from the "outside" world.
    this._components.push(proxy);
    this._componentMap.set(id, proxy);
    this._changes.set(id, {...proxy});

    // Automatically register a query for this type!
    this.registerQuery(
      type,
      (engine) => engine.components().filter(component => component.type === type)
    );

    this.tick();

    return proxy as Simple<Component<P>>;
  };

  public tick = () => {
    console.debug('Tick triggered.');
    this.changeCounter++;

    if(this._started === false) {
      console.debug(`Will skip handling this Tick because the Game has not started yet...`);
      return;
    }

    // Reset choice space.
    this._choices.clear();
    let choiceCounter = 0;

    // Calculate the complete choice space for the current game state.
    const positiveChoiceSpace: Callbackable<ImplentationChoice<Action<any>>>[] = Array.from(this._positiveRules.values())
      .map(rule => rule.handler(this, rule.properties)
        .map(choice => {
          return {
            ...choice,
            callback: rule.callback
          }
        })
      )
      .flat();

    console.debug(`After applying all positive rules, a total of ${positiveChoiceSpace.length} choices were generated...`);

    const negativeRules = Array.from(this._negativeRules.values());
    const choiceSpace: Callbackable<Identifiable<ImplentationChoice<Action<any>>>>[] = positiveChoiceSpace
      // Filter out all negative rules.
      .filter(choice => negativeRules.find(rule => rule.handler(choice, rule.properties) === false) === undefined)
      .map(choice => {
        // Generate an ID for each choice.
        return {
          id: `choice-${choiceCounter++}`,
          ...choice
        }
      });

    console.debug(`After applying all negative rules, a total of ${choiceSpace.length} choices remain...`);

    // Build entire choice space.
    choiceSpace.forEach(choice => {
      const context = choice.action.context(this, choice.entrypoint); 

      this._choices.set(
        choice.id,
        {
          id: choice.id,
          actionType: choice.action.name,
          context: context,
          player: choice.player,
          callback: () => choice.callback,
          execute: () => this.executeAction(choice.action.name, context) // TEST:
        }
      );
    });

    // There shouldnt be a State in which more than one Player can do choices - this leads to race conditions!
    const possibleActors = choiceSpace.reduce((prev, curr) => {
      prev.add(curr.player.actorId);
      return prev;
    }, new Set<string>());

    if(possibleActors.size > 1) {
      console.error(`CRITICAL: More than 1 Player (${possibleActors.size}) can do Actions in this Game State! Choice Space is `, choiceSpace);
    }

    this._playerInterfaces.forEach(player => {
      player.tickHandler(
        // TODO: Make these player-specific!
        prepareMapForExport(this._changes, jsonify),
        choiceSpace
          .filter(choice => choice.player.actorId === player.actorId)
          .map(choice => {
            const context = choice.action.context(this, choice.entrypoint);
            const message = choice.action.message(context);

            return {
              id: choice.id, // TODO: Generate a random ID here to reference this choice!
              message: message,
              actionType: choice.action.name,
              components: Object.values(context).map(component => (component as Simple<Component<unknown>>).id)
            };
          })
      );
    });

    // Clean up change state (so far)!
    this._changes.clear();
  };
  
  // Main Game Loop.
  public start = () => {
    console.debug('Game is starting!');
    this._started = true;

    (() => this.tick())();
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

    this.tick();
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

  public actions = (): ReadonlyMap<string, Action<{}, {}>> => {
    return this._actions;
  };

  // TEST: Can't have duplicate names.
  public registerAction =<T extends Action<any, any>> (action: T): T => {
    console.debug(`Registering Action "${action.name}"...`);

    this._actions.set(
      action.name,
      action
    );

    return action;
  };

  // TEST: Can't have duplicate rules.
  public registerRule = <T extends PositiveRule<Action<any>, any> | NegativeRule<Action<any>, any>> (rule: T): T => {
    console.debug(`Registering Rule "${rule.id}"...`);

    this._rules.set(
      rule.id,
      rule
    );

    if(rule.type === 'negative') {
      this._negativeRules.set(
        rule.id,
        rule
      );
    } else {
      this._positiveRules.set(
        rule.id,
        rule
      );
    }

    return rule;
  };

  // TEST: Can't register the same ActorID twice!
  public registerInterface = <T extends PlayerInterface<any>> (player: T): T => {
    console.debug(`Registering Player Interface "${player.actorId}"...`);
    
    this._playerInterfaces.push(player);

    this.tick();

    return player;
  };

  public rules = (ruleType: RuleType): ReadonlyMap<string, PositiveRule<any> | NegativeRule<any>> => {
    if(ruleType === 'positive') {
      return this._positiveRules;
    } else {
      return this._negativeRules;
    }
  };

  public players = <T extends (Component<any> | undefined) = undefined> (): ReadonlyArray<PlayerInterface<T>> => {
    return this._playerInterfaces;
  };

  public choices = (): ReadonlyMap<string, InternalChoice<any>> => {
    return this._choices;
  }

  // TEST: No trigger can be overwritten.
  // TEST: Throw an error if the ActionType has not been registered yet!
  public registerTrigger = (trigger: Trigger): Trigger => {
    console.debug(`Registering Trigger "${trigger.name}"...`);

    if(this._triggers.has(trigger.name)) {
      throw new Error(`A Trigger with the name "${trigger.name}" already exists! It would be duplicated. Please choose a new name.`);
    }

    const notExistingActions = (trigger.actionTypes ?? [])
      .filter(action => !this._actions.has(action));

    if(notExistingActions.length > 0) {
      throw new Error(`The Trigger "${trigger.name}" can't be created, because the Actions ${notExistingActions.map(a => `"${a}"`).join(', ')} have not been registered yet! Please register them first...`);
    }

    this._triggers.set(trigger.name, trigger);

    if(trigger.actionTypes === undefined) {
      console.debug(`Registering generic trigger "${trigger.name}".`);
      this._genericTriggers.push(trigger);
    } else {
      trigger.actionTypes.forEach(type => {
        console.debug(`Registering trigger "${trigger.name}" for Action Type ${type}...`);
        
        this._specificTriggers.set(
          type,
          (this._specificTriggers.get(type) ?? []).concat(trigger)
        );
      });
    }

    return trigger;
  };

  public triggers = (actionType?: string): ReadonlyArray<Trigger> => {
    if(actionType === undefined) {
      // Return all generic triggers and each unique specific Trigger!
      return this._genericTriggers.concat(Array.from(new Set(...this._specificTriggers.values())));
    }

    const triggers = this._specificTriggers.get(actionType);
    console.debug(`Found ${triggers?.length ?? 0} triggers for action type "${actionType}"...`);

    return this._genericTriggers.concat(triggers ?? []);
  };

  public execute = (actorId: string, id: string): void => {
    console.debug(`Player "${actorId}" executes choice "${id}"...`);
    const choice = this._choices.get(id);

    if(choice === undefined) {
      throw new Error(`The choice with the ID "${id}" does not exist!`);
    }

    if(choice.player.actorId !== actorId) {
      throw new Error(`Player "${actorId}" is not allowed to execute Choice #${choice.id}, because it belongs to Player "${choice.player}"!`);
    }

    console.debug(`Executing choice #${id}...`);

    if(choice.callback !== undefined) {
      console.debug(`Callback found! Calling back the Rule that generated this Choice...`);
      choice.callback(this, choice.context);
    };
    
    choice.execute();
  };

  public getRule = <T extends (PositiveRule<any, any> | NegativeRule<any, any>)> (id: string): T => {
    const rule = this._rules.get(id);

    if(rule === undefined) {
      throw new Error(`The Rule "${rule}" does not exist!`);
    }

    return rule as T;
  };

  // TEST: Throw error if actionType does not exist.
  public executeAction = <T extends Action<ENTRYPOINT>, ENTRYPOINT extends {}> (actionType: T['name'], entrypoint: ENTRYPOINT): void => {
    const action = this._actions.get(actionType);

    if(action === undefined) {
      throw new Error(`The Action "${actionType}" does not exist! Please register it first before calling it!`);
    }

    const context = action.context(this, entrypoint);

    action.execute(this, context);

    // Iterating over all triggers that might be triggered by executing this choice...
    const triggers = this._genericTriggers.concat(this._specificTriggers.get(actionType) ?? []);
    console.debug(`Evaluating a total of ${triggers.length} Triggers, whether they trigger or not for this choice...`);

    const triggerCalls = triggers
      .filter(trigger => trigger.execute(this, actionType, context))
      .flat();

    console.debug(`Will execute ${triggerCalls.length} trigger callbacks!`);

    console.debug(`Triggering new tick...`);
    this.tick();
  };
}