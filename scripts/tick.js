import { state } from './state.js';
import { render } from './render.js';

// Do an entire tick of the game state - update the view, actions, ...
export const tick = () => {
    console.log('...tack', state);

    // Render state.
    render(state);

    // Calculate action space for both players.
    state.actions = [
        // If an action like that is "found", update the UI for it, too.
        // TODO: Have a do() function, that simply executes this action!
        {actor: 32, type: 'draw', args: [null, 31]},
        {actor: 66, type: 'summon', args: [32, 66, 15]},
        {actor: 66, type: 'summon', args: [32, 66, 16]},
        {actor: 66, type: 'summon', args: [32, 66, 17]},
        {actor: 66, type: 'summon', args: [32, 66, 18]},
        {actor: 66, type: 'summon', args: [32, 66, 19]},
        {actor: 66, type: 'crystallize', args: [32, 66, 30]}
    ];

    console.info('Current action space:', state.actions);
};

