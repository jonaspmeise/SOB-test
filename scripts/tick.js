import { state } from './state.js';
import { render } from './render.js';
import { rules } from './rules.js';
import { actions } from './actions.js';

// Do an entire tick of the game state - update the view, actions, ...
export const tick = () => {
    console.log('...tack', state);

    // Render state.
    render(state);

    // Work off triggers.
    const trigger = state.triggerQueue.pop();
    if(trigger !== undefined) {
        console.error('Resolving trigger', trigger);
        trigger();
        return; // TODO: MAYBE?????
    }

    // Calculate action space for both players.
    // TODO: Right now, the action space is re-calculated greedily.
    state.actions = rules
        .map((rule) => rule.handler(state, rule.properties))
        .flat()
        .map(choice => {
            return {
              ...choice,
              execute: () => {
                // optionally do a callback.
                // we do this prior to executing the action, because there might be changes inside the property of a rule that influence our next game state.
                if(choice.callback !== undefined) {
                  choice.callback();
                }
                actions[choice.type](...choice.args);
              }
            }
        });

    console.info('Current action space:', state.actions);
};

