import { Action, Component, ID, Type } from "./types-engine";

export class GameEngine {
  private componentCounter: number = 0;
  public readonly components: Map<ID, Component> = new Map();
  public readonly types: Map<Type, ID[]> = new Map();

  public constructor() {}

  // TEST: Can't register component with same name multiple times.
  public registerComponent = <T> (properties: T, types: Type | Type[], name: string): {
    id: ID,
    types: Type[],
    toString : () => string
  } & T => {
    if(!Array.isArray(types)) {
      types = [types];
    }

    const id: ID = `component-${this.componentCounter++}`;
    console.debug(`Registering component of types "${types}" with ID ${id}...`);
    
    const modified = {
      ...properties,
      id: id,
      types: types
    };

    modified.toString = () => name;

    // Update reference maps.
    this.components.set(id, modified);

    types.forEach(type => {
      this.types.set(type, [...(this.types.get(type) ?? []), id]);
    });

    return modified;
  };

  // TEST: Can't register same Action multiple times.
  public registerAction = (action: Action<any, any>): void => {
    
  };

  // TEST: Can't register same Player multiple times.
  public registerPlayer = (player: Player
}