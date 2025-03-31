import { actions } from "./actions.js";
import { components } from "./state.js";
import { shuffle } from "./utility.js";

// Triggers consume the type of an Action, the arguments of that action and the model state.
export const triggers = [
  {
    name: 'Start of your Turn, you draw a Card.',
    check: (actionType, args, model) => {
      return (actionType === 'pass');
    },
    effect: (actionType, args, model) => {
      // Identical to the returned parameters from the action 'pass'!
      const newPlayer = args[1];

      if(newPlayer.deck$.length > 0) {
        actions.draw(newPlayer.deck$.id);
      }
      
      return [actionType, args, model];
    }
  },
  {
    name: 'During Player 2s Turn, they do a random Action.',
    check: (actionType, args, model) => {
      return model.turn.currentPlayer$ === model.players[1].id;
    },
    effect: (actionType, args, model) => {
      // Randomize the available actions for this player.
      const possibleActions = shuffle(model.actions.filter(action => action.actor === model.players[1].id));

      console.log(`AI: I have ${possibleActions.length} Actions available:`, possibleActions);

      // Try do this the following way:
      // 1. Play Units
      // 2. Crystallize
      // 3. Do random one
      let targetAction;
      targetAction = possibleActions.find(action => action.type === 'summon');

      if(targetAction === undefined) {
        targetAction = possibleActions.find(action => action.type === 'crystallize');
      }
      
      if(targetAction === undefined) {
        targetAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];
      }

      console.log(`AI: ... I will do:`, targetAction);

      // Have a delay of 1s before doing something.
      targetAction.execute();

      return [actionType, args, model];
    }
  },
  {
    name: 'When a Lane is full, the Player with Units that have most Power in that Lane conquers that Lane.',
    // Always check this, regardless of Action! (technically needed for: Summon, Move, Return, Bury, Gain Power, ...)
    check: (actionType, args, model) => true,
    effect: (actionType, args, model) => {
      // The Lane is won by the player who has most power in it.
      model.board.lanes.forEach(lane => {
        const wonByPower = lane.$properties().wonByPower$();
        console.error('WONBYPOWER', wonByPower);
        if(wonByPower === undefined) {
          return;
        }

        // Mismatch between factual wonBy (who has most power?) and who is the owner of the lane?
        const wonByState = lane.wonBy$;

        // Decrease count for other player, if this player wins (or balances) this Lane.
        if(wonByState !== wonByPower && wonByState !== undefined) {
          const previousLaneOwner = components.get(wonByState);
          previousLaneOwner.wonLanes = previousLaneOwner.wonLanes - 1;
        }

        if(wonByState !== wonByPower) {
          lane.wonBy$ = wonByPower;
          actions.conquer(lane.wonBy$, lane);
        }
      });

      return [actionType, args, model];
    }
  }
];