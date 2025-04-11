// Import Chai and assertion styles
import { expect } from 'chai';
import { GameEngine } from '../client/scripts/engine/engine.js';
import { ShardsOfBeyondActionType } from '../client/scripts/game/types-game.js';
import { INITIALIZE_BEYOND_GAMESTATE } from '../client/scripts/game/state.js';

console.debug = () => {};

// Example test suite
describe('Component Initialization', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
    INITIALIZE_BEYOND_GAMESTATE(engine, []);

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
          engine.query(combination.type)
        ).length(combination.number);
      });
    });
  });
});