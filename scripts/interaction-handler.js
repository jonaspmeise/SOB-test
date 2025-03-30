import { components, state } from "./state.js";
import { log } from './utility.js';
import { RAW_ACTION_DICTIONARY, actions } from "./actions.js";

// TODO: AI should simply do a random action from its action space, whenever feasible.
// TODO: This should be an Object with Type -> Args, but for now we only accept single types.
let handleContextArguments = {
    context: new Set(),
    choices: []
};
const highlight = (actions, alreadySeenContext) => {
    [...actions
        .map(action => action.args)
        .flat()
        // Filter out duplicate entries.
        .reduce((prev, current) => {
            if(prev.has(current)) {
                prev.set(current, undefined);
                return prev;
            }

            prev.set(current, 'yay');
            return prev;
        }, new Map())
        .entries()]
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => key)
        // Highlight all remaining elements.
        .filter(id => !alreadySeenContext.has(id))
        .forEach(id => {
            console.log('Highlighting ', id);

            const element = document.getElementById(id);
            element.classList.add('highlight');
        });
};
export const resetHandleContext = () => {
    // Reset context and disable highlight!
    handleContextArguments = {
        context: new Set(),
        choices: []
    };
    console.debug('Resetting all highlights');
    document.querySelectorAll('.highlight').forEach(e => e.classList.remove('highlight'));
};

// TODO: An essentially empty handlecontext can just be filled with all actions from the action space (that are applicable).
// From there on, it's easy going! If Choice space is empty => Reload with action space.
export const handleInteraction = (id) => {
    console.log('Context handler', handleContextArguments);

    const component = components.get(id);
    log(`${state.turn.currentPlayer} interacted with ${component} (#${id})`, true);

    // Does this interaction narrow down the choice space enough that we can execute a single action?
    if(handleContextArguments.choices.length > 0) {
        const narrowedDownChoices = handleContextArguments.choices
            .filter(choice => choice.args.includes(id));

        if(narrowedDownChoices.length == 1) {
            const action = narrowedDownChoices[0];
            console.log(`Narrowed down interaction for ${action.type}: ${action.args}!`);
            actions[action.type](...action.args);
        } else if(narrowedDownChoices.length == 0) {
            console.log('Resetting context, because this interaction doesnt do anything with the choice space.');
            resetHandleContext();
        } else {
            // We just continue with these choices!
            handleContextArguments.choices = narrowedDownChoices;
            handleContextArguments.context.add(id);

            // Add highlights to all elements that are not shared across _all_ possible actions.
            highlight(handleContextArguments.choices, handleContextArguments.context);
        }

        return;
    }

    console.debug('Before filtering actions:', component.types, state.actions);
    const possibleActions = state.actions
        // filter out actions where the current component is not part of its targets.
        .filter(action => {
            console.debug('Action debug: ', id, action.args);
            return action.args.includes(id);
        });
        // TODO: Filter only one's own actions (player)!

    console.debug('After filtering actions:', possibleActions);

    if(possibleActions.length == 1) {
        const action = possibleActions[0];

        // Execute chosen action.
        actions[action.type](...action.args);
        return;
    } 

    // There are many possible choices for choosing an action - we narrow it down
    // and then save the filtered combinations.
    console.debug('Possible actions for selected Component:', possibleActions);
    handleContextArguments.context.add(id);
    handleContextArguments.choices = possibleActions;

    // Add highlights to all elements that are not shared across _all_ possible actions.
    highlight(handleContextArguments.choices, handleContextArguments.context);
};