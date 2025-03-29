import { components } from './state.js';
import { resetHandleContext } from './interaction-handler.js';
import { log } from './utility.js';
import { tick } from './tick.js';

export const RAW_ACTION_DICTIONARY = {
    draw: {
        execute: (player = null, deck$) => {
            // Default to Player's Deck.
            if(player == null) {
                player = components.get(deck$.owner$);
            }
            const card = components.get(deck$.pop());
            player.hand$.push(card.id);
            card.location$ = player.hand$.id;
            
            return [player, deck$];
        },
        log: (player, deck$) => `Player ${player} drew a card from ${deck$}.`,
        target: 'deck'
    },
    summon: {
        execute: (player, card, slot) => {
            slot.card$ = card.id; // Move card to slot.

            // Remove card from previous location.
            const previousLocation = components.get(card.location$);

            // Modify the existing container by rewriting the reference.
            if(Array.isArray(previousLocation)) {
                previousLocation.splice(previousLocation.indexOf(card.id), 1);
            } else {
                console.error('WHAT DOES THIS MEAN? WHERE IS THE COMPONENT REFERENCED? Previous location was', previousLocation);
            }
            
            card.location$ = slot.id; // Reference card to slot.

            return [player, card, slot];
        },
        log: (player, card, slot) => `Player ${player} summoned a ${card} into Slot ${slot}.`,
        target: 'card'
    },
    crystallize: {
        execute: (player, card, crystalzone$) => {
            crystalzone$.push(card.id);
            // Remove card from previous location.
            const previousLocation = components.get(card.location$);

            // Modify the existing container by rewriting the reference.
            if(Array.isArray(previousLocation)) {
                previousLocation.splice(previousLocation.indexOf(card.id), 1);
            } else {
                console.error('WHAT DOES THIS MEAN? WHERE IS THE COMPONENT REFERENCED? Previous location was', previousLocation);
            }
            
            card.location$ = crystalzone$.id; // Reference card to slot.

            return [player, card, crystalzone$];
        },
        log: (player, card, crystalzone$) => `Player ${player} crystallized ${card}.`,
        target: 'card'
    },
};
export const actions = new Proxy(RAW_ACTION_DICTIONARY, {
    get: (target, prop, _receiver) => {
        const response = target[prop];

        // Automatically execute logging on action execution.
        return new Proxy(response.execute, {
            apply: (target, thisArg, argArray) => {

                // References inside the arguments need to be translated to real components!
                console.debug(`Executing action ${prop} with components ${argArray}`);
                const mappedArray = argArray.map(arg => {
                    if(typeof arg != "number") {
                        return arg;
                    }

                    return components.get(arg);
                });

                const usedParameters = target.apply(thisArg, mappedArray);

                // Reset handle context after action has been executed.
                resetHandleContext();
                log(response.log(...usedParameters));
                tick();
            }
        });
    }
});
