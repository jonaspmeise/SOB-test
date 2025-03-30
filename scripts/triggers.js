import { actions } from "./actions.js";

export const triggers = [
  {
    name: 'Start of your Turn, you draw a Card.',
    check: (action, args) => {
      return (action === 'pass');
    },
    effect: (action, args) => {
      // Identical to the returned parameters from the action 'pass'!
      const newPlayer = args[1];

      if(newPlayer.deck$.length === 0) {
        actions.draw(newPlayer.deck$.id);
      }
    }
  }
];