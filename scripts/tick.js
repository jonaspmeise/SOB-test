import { state } from './state.js';
import { render } from './render.js';
import { rules } from './rules.js';
import { actions } from './actions.js';
import { highlight } from './interaction-handler.js';

// Do an entire tick of the game state - update the view, actions, ...
export const tick = (depth = 0) => {
    console.log('...tack', state);

    // Render state.
    render(state);

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

    // Work off triggers.
    const trigger = state.triggerQueue.pop();
    if(trigger !== undefined) {
        console.log('Resolving trigger', trigger, 'Remaining Triggers:', state.triggerQueue);

        // TODO: Ugly; for this trigger call, we need to receive the input parameters again....
        const args = trigger();

        // Help all stateful rules to clean up their state.
        rules
            .filter(rule => rule.onTrigger !== undefined)
            .forEach(rule => {
                console.log(`Helping Rule ${rule.name} to clean up....`);
                rule.onTrigger(...args, rule.properties);
            });

        // TODO: Trigger a re-evaluation...?
        tick(depth + 1);
    }

    // Only all triggers "returned", do some UI QoL.
    if(depth == 0) {
        console.info('Current action space:', state.actions);
        highlight(state.actions, new Set(), true);
    }
};

