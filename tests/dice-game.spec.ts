import { expect } from "chai";
import { GameEngine } from "../client/scripts/engine/engine.js";
import { Action, Changes, Component, PlayerChoice, Rule, Simple } from "../client/scripts/engine/types-engine.js";

type Die = Component<{
  sides: number,
  value: number
}>;

describe('Simple Dice Game.', () => {
  let engine: GameEngine = new GameEngine();

  beforeEach(() => {
    engine = new GameEngine();
  });
  
  it('If a Rule exists that enables an Action (it generates choices for it), the player is informed about choices.', (done) => {
    engine.registerComponent({
      sides: 6,
      value: 1
    }, 'die') as Simple<Die>;
    engine.registerComponent({
      sides: 20,
      value: 1
    }, 'die') as Simple<Die>;

    const roll: Action<{die: Die}> = engine.registerAction({
      name: 'roll',
      execute: (engine, parameters: {
        die: Die
      }) => {
        parameters.die.value = Math.floor(Math.random() * parameters.die.sides);

        return parameters;
      },
      log: (parameters) => `Dice ${parameters.die} was rolled`
    });

    const canRoll: Rule = engine.registerRule({
      type: 'positive',
      name: 'Dice can be rolled.',
      handler: (engine) => engine.query('die').map(die => {
        return engine.players().map(player => {
          return {
            player: player,
            actionType: 'roll',
            context: {
              die: die
            },
            execute: () => {
              // For now, this is irrelevant:
              // engine.executeAction('roll', {die: die})
            }
          };
        });
      }).flat()
    });

    engine.registerInterface({
      tickHandler: (_delta: Changes, choices: PlayerChoice<unknown>[]) => {
        expect(choices).to.have.length(2);

        expect(choices[0].actionType).to.equal('roll');
        expect(choices[0].context).to.deep.equal({die: '@0'});
        
        expect(choices[1].actionType).to.equal('roll');
        expect(choices[1].context).to.deep.equal({die: '@1'});

        done();
      },
      actorId: 'player-1'
    });

    engine.tick();
  });

  // TEST: Negative Rules have precedence over positive Rules: Positive Rule is "Increase Die", Negative Rule is "Only increase dice that have value of 1"
});