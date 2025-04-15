import { expect } from "chai";
import { GameEngine } from "../client/scripts/engine/engine.js";
import { Action, Changes, CommunicatedChoice, Component, NegativeRule, PositiveRule, Simple } from "../client/scripts/engine/types-engine.js";

type Die = Component<{
  sides: number,
  value: number
}>;

describe('Simple Dice Game.', () => {
  let engine: GameEngine = new GameEngine();

  beforeEach(() => {
    engine = new GameEngine();
  });
  
  it('If a Rule exists that enables an Action (it generates choices for it), all players are informed about their choices.', (done) => {
    engine.registerComponent({
      sides: 6,
      value: 1,
    }, 'die', 'D6') as Simple<Die>;
    engine.registerComponent({
      sides: 20,
      value: 1
    }, 'die', 'D20') as Simple<Die>;

    const roll: Action<{die: Die}> = engine.registerAction({
      name: 'roll',
      execute: (engine, context) => {
        context.die.value = Math.floor(Math.random() * context.die.sides);

        return context;
      },
      context: (engine, entrypoint) => entrypoint,
      message: (context) => `Roll ${context.die}`,
      log: (parameters) => `${parameters.die} was rolled`
    });

    const canRoll: PositiveRule<typeof roll> = engine.registerRule({
      id: 'dice-can-be-rolled',
      type: 'positive',
      name: 'Dice can be rolled.',
      handler: (engine) => engine.query<Die>('die').map(die => {
        return engine.players().map(player => {
          return {
            player: player,
            action: roll,
            entrypoint: {
              die: die
            }
          };
        });
      }).flat()
    });

    engine.registerInterface({
      tickHandler: (engine, _delta: Changes, choices: CommunicatedChoice[]) => {
        expect(choices).to.have.length(2);

        expect(choices[0].actionType).to.equal('roll');
        expect(choices[0].message).to.equal(`Roll D6`);
        expect(choices[0].components).to.deep.equal(['0']);

        expect(engine.choices().get(choices[0].id)).to.not.be.undefined;
        
        expect(choices[1].actionType).to.equal('roll');
        expect(choices[1].message).to.equal(`Roll D20`);
        expect(choices[1].components).to.deep.equal(['1']);
        expect(engine.choices().get(choices[1].id)).to.not.be.undefined;
      },
      actorId: 'player-01'
    });

    engine.registerInterface({
      tickHandler: (engine, _delta: Changes, choices: CommunicatedChoice[]) => {
        expect(choices).to.have.length(2);

        expect(choices[0].actionType).to.equal('roll');
        expect(choices[0].message).to.equal(`Roll D6`);
        expect(choices[0].components).to.deep.equal(['0']);

        expect(engine.choices().get(choices[0].id)).to.not.be.undefined;
        
        expect(choices[1].actionType).to.equal('roll');
        expect(choices[1].message).to.equal(`Roll D20`);
        expect(choices[1].components).to.deep.equal(['1']);
        expect(engine.choices().get(choices[1].id)).to.not.be.undefined;

        done();
      },
      actorId: 'player-02'
    });

    engine.start();
  });

  it('Negative Rules have precedence over positive rules.', (done) => {
    engine.registerComponent({
      sides: 6,
      value: 3 // IMPORTANT: This Die has a current value of 3!
    }, 'die') as Simple<Die>;

    const spinupAction = engine.registerAction({
      name: 'spin-up',
      execute: (engine, context) => {
        context.die.value++;

        return context;
      },
      context: (engine, entrypoint) => entrypoint,
      message: (context) => `Spin ${context.die} up`,
      log: (parameters) => `${parameters.die} was spun up.`
    }) as Action<{die: Die}>;

    engine.registerRule({
      id: 'dice-can-be-spun',
      name: 'Dice can be spun up.',
      type: 'positive',
      handler: (engine) => {
        return engine.players().map(player => (engine.query<Die>('die')).map(die => {
          return {
            action: spinupAction,
            entrypoint: {die: die},
            player: player
          };
        })).flat()
      }
    }) as PositiveRule<typeof spinupAction>;
    
    engine.registerRule({
      id: 'dice-cant-be-spun-beyond-maximum',
      name: 'Dice cant be spun up if their value is bigger than 1.',
      type: 'negative',
      handler: (choice) => {
        if(choice.action.name !== 'spin-up') {
          return true;
        }

        return (choice.entrypoint.die as Simple<Die>).value <= 1;
      }
    }) as NegativeRule<typeof spinupAction>;

    // This already triggers a Tick in itself.
    engine.registerInterface({
      actorId: 'player-01',
      tickHandler: (engine, delta: Changes, choices: CommunicatedChoice[]) => {
        expect(choices).to.have.length(0); // The negative rule overwrites the positive rule here!
        done();
      }
    });
    
    engine.start();
  });

  it('Actions can be executed.', (done) => {
    
    engine.registerComponent({
      sides: 6,
      value: 1
    }, 'die') as Simple<Die>;

    const spinupAction = engine.registerAction({
      name: 'spin-up',
      execute: (engine, context) => {
        context.die.value++;

        return context;
      },
      context: (engine, entrypoint) => entrypoint,
      message: (context) => `Spin ${context.die} up`,
      log: (parameters) => `${parameters.die} was spun up.`
    }) as Action<{die: Die}>;
    
    engine.registerRule({
      id: 'dice-can-be-spun',
      name: 'Dice can be spun up.',
      type: 'positive',
      handler: (engine) => {
        return engine.players().map(player => (engine.query<Die>('die')).map(die => {
          return {
            action: spinupAction,
            entrypoint: {die: die},
            player: player
          };
        })).flat()
      }
    }) as PositiveRule<typeof spinupAction>;

    // This already triggers a tick in itself.
    engine.registerInterface({
      actorId: 'player-01',
      tickHandler: (engine, delta: Changes, choices: CommunicatedChoice[]) => {
        expect(choices).to.have.length(1); // 1 Dice can be spun up!

        // We already spun the dice up once?
        if((delta.get('0') as Die)?.value === 2) {
          done();
        }

        engine.execute(choices[0].id);
      }
    });
    
    engine.start();
  });

  it('Triggers are called (not necessarily executed!) whenever a choice is executed.', (done) => {
    const myDie = engine.registerComponent({
      sides: 6,
      value: 1
    }, 'die') as Simple<Die>;

    const spinupAction = engine.registerAction({
      name: 'spin-up',
      execute: (engine, context) => {
        context.die.value++;

        return context;
      },
      context: (engine, entrypoint) => entrypoint,
      message: (context) => `Spin ${context.die} up`,
      log: (parameters) => `${parameters.die} was spun up.`
    }) as Action<{die: Die}>;
    
    engine.registerRule({
      id: 'dice-can-be-rolled',
      name: 'Dice can be spun up.',
      type: 'positive',
      handler: (engine) => {
        return engine.players().map(player => (engine.query<Die>('die'))
          .filter(die => die.value < die.sides) // Only dice that are not yet on their maximum can be spun up!
          .map(die => {
            return {
              action: spinupAction,
              entrypoint: {die: die},
              player: player
            };
          })).flat()
      }
    }) as PositiveRule<typeof spinupAction>;

    let counter = 0;
    engine.registerTrigger({
      name: 'Whenever a Die is spun, this Test succeeds.',
      execute: (engine, actionType, context) => {
        expect(actionType).to.equal('spin-up');
        expect(context).to.deep.equal({
          die: myDie
        });

        // We only need to check the first execution - if we check _all_ calls for this Trigger, it considers the test to be erroreous!
        if(counter++ === 0) {
          done();
        }

        return [];
      }
    })

    engine.registerInterface({
      actorId: 'player-01',
      tickHandler: (engine, delta: Changes, choices: CommunicatedChoice[]) => {
        if(choices.length > 0) {
          engine.execute(choices[0].id);
        }
      }
    });

    engine.start();
  });

  it('An Action can straight be executed with the Engine.', () => {
    const die = engine.registerComponent({
      sides: 6,
      value: 1
    }, 'die') as Simple<Die>;

    const ACTION_SPINUP = engine.registerAction({
      name: 'spin-up',
      execute: (engine, context) => {
        context.die.value++;

        return context;
      },
      context: (engine, entrypoint) => entrypoint,
      message: (context) => `Spin ${context.die} up`,
      log: (parameters) => `${parameters.die} was spun up.`
    }) as Action<{die: Die}>;

    engine.executeAction<typeof ACTION_SPINUP, {die: Die}>('spin-up', {die: die});

    expect(die.value).to.equal(2);
  });

  // TODO: Logs, full state transfer...
});