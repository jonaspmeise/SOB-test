import { state, types } from './state.js';
import { render } from './render.js';

// Do an entire tick of the game state - update the view, actions, ...
export const tick = () => {
    console.log('...tack', state);

    // Render state.
    render(state);

    // Calculate action space for both players.
    // TODO: Right now, the action space is re-calculated greedily.
    state.actions = [];
    state.players.forEach(player => {
        // Every Player can crystallize a Unit from their Hand.
        // TODO: Should be reset after every turn!
        player.hand$.forEach(id => {
            state.actions.push({
                actor: player.id,
                type: 'crystallize',
                args: [id]
            });
        });

        // Every Player can pass their Turn.
        state.actions.push({
            actor: player.id,
            type: 'pass',
            args: [types.get('turn')[0]]
        });
    });
    
    /*
    state.actions = [
        // If an action like that is "found", update the UI for it, too.
        // TODO: Have a do() function, that simply executes this action!
        {actor: 32, type: 'draw', args: [31]},
        {actor: 66, type: 'summon', args: [66, 15]},
        {actor: 66, type: 'summon', args: [66, 16]},
        {actor: 66, type: 'summon', args: [66, 17]},
        {actor: 66, type: 'summon', args: [66, 18]},
        {actor: 66, type: 'summon', args: [66, 19]},
        {actor: 66, type: 'crystallize', args: [66, 30]}
    ];
    */

    console.info('Current action space:', state.actions);
};

