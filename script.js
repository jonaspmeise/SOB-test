// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

import { log } from './scripts/utility.js';
import { state, identify, components, types } from './scripts/state.js';
import { actions } from './scripts/actions.js';
import { highlight, resetHandleContext } from './scripts/interaction-handler.js';
import { rules } from './scripts/rules.js';
import { triggers } from './scripts/triggers.js';

// CONSTANTS
const cardFile = './cards.json';
window._model = {
    actions: actions,
    state: state,
    components: components,
    types: types,
    rules: rules,
    triggers: triggers
};

// Events: When clicking "anywhere else", reset the handleContext.
document.body.addEventListener('click', () => {
    resetHandleContext();
});

// SCRIPT
document.addEventListener('DOMContentLoaded', async () => {
    const request = await fetch(cardFile);
    const cards = (await request.json())
        .filter(card => card.Set == 1) // Only valid cards from Set 1 should be made into decks.
        .filter(card => card.Cardtype === 'Unit') // Only play with Units.
        // Calculate costs of card nicely!
        .map(card => {
            return {
                ...card,
                costs: card.Costs.split(',')
                    .map(realm => realm.trim())
                    .reduce((prev, curr) => {
                        if(curr !== '?') {
                            prev[curr] = prev[curr] + 1;
        });

    log(`Loaded a total of ${cards.length} cards!`, undefined, true);

    // Fill each Players deck with 30 random cards.
    state.players.forEach(player => {
        Array(30).fill().forEach(() => {
            const randomCard = cards[Math.floor(Math.random() * cards.length)];

            // Add ownership to cards.
            player.deck$.push(identify({...randomCard, owner$: player.id, location$: player.deck$.id}, ['card'], randomCard.Name).id);
        });
    });

    // Randomize starting player.
    state.turn.currentPlayer$ = state.players[0].id;

    // Each Player draws 5 cards from their Deck.
    state.players.forEach(player => {
        Array(5).fill().forEach(() => {
            actions.draw(player.deck$);
        });
    });

    console.log('State after initialization:', state);
    highlight(state.actions, new Set(), true);
});
