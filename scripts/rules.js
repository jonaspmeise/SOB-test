import { components } from "./state.js";

export const rules = [
  // TODO: Register this rule with triggers for "end of turn" (to reset the counter)
  {
    name: 'Players may crystallize one card during their Turn from their Hand.',
    properties: {
      // Track per Player how many cards they crystallized already.
      alreadyCrystallized: [0, 0]
    },
    handler: (model, properties) => {
      return model.players.map((player, i) => {
        // If it's not your Turn, do nothing.
        if(model.turn.currentPlayer$ !== player.id) {
          return undefined;
        }
        // If already crystallized, they may not crystallize.
        if(properties.alreadyCrystallized[player.index] > 0) {
          return undefined;
        }

        return player.hand$.map(card => {
          return {
            actor: player.id,
            type: 'crystallize',
            args: [card],
            // !!!
            callback: () => properties.alreadyCrystallized[player.index]++
          };
        });
      })
      .filter(action => action !== undefined)
      .flat();
    },
    // Reset conditions after every turn.
    onTrigger: (actionType, args, model, properties) => {
      if(actionType === 'pass') {
        properties.alreadyCrystallized = [0, 0];
      }
    }
  },
  {
    name: 'Players may pass their Turn during their Turn.',
    properties: {},
    handler: (model, _properties) => {
      return {actor: model.turn.currentPlayer$, type: 'pass', args: [model.turn.id]};
    }
  },
  {
    name: 'Players may play a single Card from their Hand during their Turn.',
    properties: {
      // Track per Player how many cards they played already.
      alreadyPlayed: [0, 0]
    },
    handler: (model, properties) => {
      return model.players.map((player, i) => {
        // If it's not your Turn, do nothing.
        if(model.turn.currentPlayer$ !== player.id) {
          return undefined;
        }
        // If already crystallized, they may not crystallize.
        if(properties.alreadyPlayed[player.index] > 0) {
          return undefined;
        }

        const crystalCount = player.crystalzone$.$realmCounts();

        return player.hand$.map(cardId => {
          // You may only summon the Card if you meet its requirements.
          // Card too expensive....
          const card = components.get(cardId);
          if(card.costs.total > player.crystalzone$.length) {
            return undefined;
          }
          
          // If one of the costs is outside the range of your owned Crystals.
          if(Object.entries(card.costs)
            .filter(([key, value]) => value > crystalCount[key])
            .length > 0
          ) {
            return undefined;
          }

          // May summon in a free Slot.
          return model.board.slots
            .filter(slot => slot.card$ === undefined)
            .map(slot => slot.id)
            .map(slotId => {
              return {
                actor: player.id,
                type: 'summon',
                args: [cardId, slotId],
                // !!!
                callback: () => properties.alreadyPlayed[player.index]++
              };
            });
        }).flat();
      })
      .flat()
      .filter(action => action !== undefined);
    },
    // Reset conditions after every turn.
    onTrigger: (actionType, args, model, properties) => {
      if(actionType === 'pass') {
        properties.alreadyPlayed = [0, 0];
      }
    }
  }
];