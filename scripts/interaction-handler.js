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
    const player = components.get(state.turn.currentPlayer$);
    log(`${player} interacted with ${component} (#${id})`, player, true);

    // Does this interaction narrow down the choice space enough that we can execute a single action?
    if(handleContextArguments.choices.length > 0) {
        const narrowedDownChoices = handleContextArguments.choices
            .filter(choice => choice.args.includes(id));

        if(narrowedDownChoices.length == 1) {
            const choice = narrowedDownChoices[0];
            console.log(`Narrowed down interaction for ${choice.type}: ${choice.args}!`);

            //actions[choice.type](...choice.args);
            choice.execute();

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
    const possibleChoices = state.actions
        // filter out actions where the current component is not part of its targets.
        .filter(action => {
            console.debug('Action debug: ', id, action.args);
            return action.args.includes(id);
        });
        // TODO: Filter only one's own actions (player)!

    console.debug('After filtering actions:', possibleChoices);

    // Execute chosen action if there is only a single one available.
    if(possibleChoices.length == 1) {
        console.info(possibleChoices);
        possibleChoices[0].execute();

        return;
    } 

    // There are many possible choices for choosing an action - we narrow it down
    // and then save the filtered combinations.
    console.debug('Possible choices for selected Component:', possibleChoices);
    handleContextArguments.context.add(id);
    handleContextArguments.choices = possibleChoices;

    // Add highlights to all elements that are not shared across _all_ possible actions.
    highlight(handleContextArguments.choices, handleContextArguments.context);
};