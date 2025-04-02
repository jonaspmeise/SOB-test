import { Choice, Components, PlayerClient, TickHandler } from "../engine/types-engine";
import { shuffle } from "../engine/utility";

export class AIClient implements PlayerClient {
  public tickHandler: TickHandler = (_: Components, choices: Choice[]) => {
    console.log('AI: I have choices!', choices);

    if(choices.length == 0) {
      console.log('AI: I have nothing to do... :/');
      return;
    }

    shuffle(choices)[Math.floor(Math.random() * choices.length)].execute();
  };
}