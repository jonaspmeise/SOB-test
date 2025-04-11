import { expect } from "chai";
import { GameEngine } from "../client/scripts/engine/engine.js";
import { Action, Changes, Component, NegativeRule, PlayerChoice, Rule, Simple } from "../client/scripts/engine/types-engine.js";

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
      context: (entrypoint) => entrypoint,
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

  it('Negative Rules have precedence over positive rules.', (done) => {
    engine.registerComponent({
      sides: 6,
      value: 3 // IMPORTANT: This Die has a current value of 3!
    }, 'die') as Simple<Die>;

    const rollAction = engine.registerAction({
      name: 'spin-up',
      execute: (engine, parameters: {die: Die}) => {
        parameters.die.value++;
      },
      context: (entrypoint) => entrypoint,
      log: (parameters) => `${parameters.die} was spun up.`
    }) as Action<{die: Die}>;

    // TODO: Too many redundant values!
    const rollRule = engine.registerRule({
      name: 'Dice can be spun up.',
      type: 'positive',
      handler: (engine) => {
        return engine.players().map(player => engine.query('die').map(die => {
          return {
            actionType: 'spin-up',
            context: {die: die},
            player: player,
            execute: () => {
              engine.executeAction('spin-up', {die: die}, player);
            }
          };
        })).flat()
      }
    });
    
    // TODO: Types.
    engine.registerRule({
      name: 'Dice cant be spun up if their value is bigger than 1.',
      type: 'negative',
      handler: (choice) => {
        if(choice.actionType !== 'spin-up') {
          return true;
        }

        return (choice.context.die as Die).value <= 1;
      }
    }) as NegativeRule<typeof rollAction>;

    engine.registerInterface({
      actorId: 'player-01',
      tickHandler: (delta: Changes, choices: PlayerChoice<unknown>[]) => {
        expect(choices).to.have.length(0); // The negative rule overwrites the positive rule here!
        done();
      }
    });

    engine.tick();
  });
  // TEST: Context should hang on an action (THE RETURN TYPE), not a rule or choice!
});