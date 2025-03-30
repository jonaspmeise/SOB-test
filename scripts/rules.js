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
    }
  },
  {
    name: 'Players may pass their Turn during their Turn.',
    properties: {},
    handler: (model, _properties) => {
      return {actor: model.turn.currentPlayer$, type: 'pass', args: [model.turn.id]};
    }
  }
];