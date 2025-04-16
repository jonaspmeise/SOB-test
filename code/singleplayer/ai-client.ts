import { Changes, CommunicatedChoice, Components, InMemoryPlayerClient, TickHandler } from "../engine/types-engine.js";
import { shuffle } from "../engine/utility.js";

export class AIClient implements InMemoryPlayerClient {
  public tickHandler: TickHandler = (engine, stateDelta: Changes, choices: CommunicatedChoice[]) => {
    console.log('AI: I have choices!', choices);

    if(choices.length == 0) {
      console.log('AI: I have nothing to do... :/');
      return;
    }

    const choice = shuffle(choices)[Math.floor(Math.random() * choices.length)];
    console.log(`AI: I execute choice`, choice);

    // engine.execute(choice.id);
  };
}