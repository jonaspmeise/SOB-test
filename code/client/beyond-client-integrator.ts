import { ID, Simple, Component, TickHandler, CommunicatedChoice, Changes } from "../engine/types-engine.js";
import { BeyondClient } from "./beyond-client.js";

export class BeyondClientIntegrator {
  public readonly components: Map<ID, Simple<Component<any>>> = new Map();
  public choices: CommunicatedChoice[] = [];

  constructor(private readonly client: BeyondClient) {}

  public handleJSON = (json: string): void => {

  };

  public handleTick = (delta: Changes, choices: CommunicatedChoice[]) => {
    // Integrate the incoming delta into our current view.
    Array.from(delta.entries()).forEach(([id, change]) => {
      this.components.set(
        id,
        {
          ...(this.components.get(id) ?? {}),
          ...(change as Simple<Component<any>>)
        }
      );
    });

    // TODO: We might auto-accept any single choice. Or leave user time to think...?
    this.choices = choices;
    console.debug('Player sees changes:', delta);
    console.debug('Player has choices:', choices);
    
    this.client.render(this.components);
  };

  public pickChoice = (choice: CommunicatedChoice) => {
    
  };
}