// Import Chai and assertion styles
import { expect } from 'chai';
import { GameEngine } from '../client/scripts/engine/engine.js';
import { ShardsOfBeyondActionType } from '../client/scripts/game/types-game.js';
import { INITIALIZE_BEYOND_GAMESTATE } from '../client/scripts/game/state.js';

// Example test suite
describe('Component Initialization', () => {
  let engine: GameEngine<ShardsOfBeyondActionType>;

  beforeEach(() => {
    engine = new GameEngine<ShardsOfBeyondActionType>();
    INITIALIZE_BEYOND_GAMESTATE(engine);

    engine.start();
  });

  describe('Game State should be initialized correctly.', () => {
    [
      {type: 'player', number: 2},
      {type: 'hand', number: 2},
      {type: 'deck', number: 2},
      {type: 'crystalzone', number: 2},
      {type: 'lane', number: 9},
      {type: 'slot', number: 20}
    ].forEach(combination => {
      it(`has the correct number of ${combination.type} registered: ${combination.number}`, () => {
        expect(
          engine.components.filter(component => component.types.includes(combination.type))
        ).length(combination.number);
      });
    })

    it('should return -1 when the value is not present', () => {
      expect([1, 2, 3].indexOf(4)).to.equal(-1);
    });
  });
});