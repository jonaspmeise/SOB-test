import { GameEngine } from "../engine/engine.js";
import { Changes, CommunicatedChoice, Components, PlayerInterface, TickHandler } from "../engine/types-engine.js";
import { shuffle } from "../engine/utility.js";

export class AIClientIntegrator {

  public constructor(
    private readonly engine: GameEngine,
    private readonly actorId: string
  ) {}

  public tickHandler: TickHandler = (stateDelta: Changes, choices: CommunicatedChoice[]) => {
    console.log('AI: I have choices!', choices);

    if(choices.length == 0) {
      console.log('AI: I have nothing to do... :/');
      return;
    }

    const choice = shuffle(choices)[Math.floor(Math.random() * choices.length)];
    console.log(`AI: I execute choice`, choice);

    this.engine.execute(this.actorId, choice.id);
  };
}