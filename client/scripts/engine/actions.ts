import { components, state } from './state.js';
import { resetHandleContext } from './interaction-handler.js';
import { log } from './utility.js';
import { tick } from './tick.js';
import { triggers } from './triggers.js';

export const RAW_ACTION_DICTIONARY = {
    draw: {
        execute: (deck, _model) => {
            const player = components.get(deck.owner$);
            
            const card = components.get(deck.pop());
            player.hand$.push(card.id);
            card.location$ = player.hand$.id;
            
            // Important: First parameter is always the player!
            return [player, deck];
        },
        log: (player, deck) => `${player} drew a card from ${deck}.`,
        color: 'blue'
    },
    summon: {
        execute: (card, slot, _model) => {
            const player = components.get(card.owner$);
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

            // Important: First parameter is always the player!
            return [player, card, slot];
        },
        log: (player, card, slot) => `${player} summoned ${card} into Slot ${slot}.`,
        color: 'orangered'
    },
    crystallize: {
        execute: (card, crystalzone, _model) => {
            const player = components.get(card.owner$);

            if(crystalzone === undefined) {
                crystalzone = player.crystalzone$;
            }

            crystalzone.push(card.id);
            // Remove card from previous location.
            const previousLocation = components.get(card.location$);

            // Modify the existing container by rewriting the reference.
            if(Array.isArray(previousLocation)) {
                previousLocation.splice(previousLocation.indexOf(card.id), 1);
            } else {
                console.error('WHAT DOES THIS MEAN? WHERE IS THE COMPONENT REFERENCED? Previous location was', previousLocation);
            }
            
            card.location$ = crystalzone.id; // Reference card to slot.

            // Important: First parameter is always the player!
            return [player, card];
        },
        log: (player, card) => `${player} crystallized ${card}.`,
        color: 'darkgoldenrod'
    },
    pass: {
        execute: (turn, model) => {
            // Change active player to other Player.
            const oldPlayerId = turn.currentPlayer$;
            const nextPlayer = model.players
                .filter(player => player.id !== oldPlayerId)[0];
                
            turn.currentPlayer$ = nextPlayer.id;

            return [components.get(oldPlayerId), nextPlayer];
        },
        log: (oldPlayer, newPlayer) => `${oldPlayer} passed their Turn to ${newPlayer}.`,
        color: 'green'
    },
    conquer: {
        execute: (player, lane, model) => {
            lane.wonBy$ = player.id;
            player.wonLanes = player.wonLanes + 1;

            return [player, lane];
        },
        log: (player, lane) => `${player} conquers ${lane}.`,
        color: undefined // This is never an action done by the player.
    }
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

                mappedArray.push(state);
                const usedParameters = target.apply(thisArg, mappedArray);

                // Reset handle context after action has been executed.
                resetHandleContext();
                log(response.log(...usedParameters), usedParameters[0]);

                // Add trigger for this action to trigger list.
                const triggerToExecute = triggers
                    .filter(trigger => trigger.check(prop, usedParameters, state));
                console.debug(`Creating ${triggerToExecute.length} triggers.`, triggerToExecute.map(trigger => trigger.name));

                // Make the trigger an executable
                state.triggerQueue.push(...triggerToExecute.map(trigger => (() => trigger.effect(prop, usedParameters, state))));

                tick();
            }
        });
    }
});