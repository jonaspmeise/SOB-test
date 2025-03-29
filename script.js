// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

import { log } from './scripts/utility.js';
import { state, identify } from './scripts/state.js';
import { actions } from './scripts/actions.js';
import { resetHandleContext } from './scripts/interaction-handler.js';

// CONSTANTS
const cardFile = './cards.json';

// Events: When clicking "anywhere else", reset the handleContext.
document.body.addEventListener('click', () => {
    resetHandleContext();
});

// SCRIPT
document.addEventListener('DOMContentLoaded', async () => {
    const request = await fetch(cardFile);
    const cards = (await request.json())
        .filter(card => card.Set == 1) // Only valid cards from Set 1 should be made into decks.
        .filter(card => card.Cardtype === 'Unit'); // Only play with Units.

    log(`Loaded a total of ${cards.length} cards!`, true);

    // Fill each Players deck with 30 random cards.
    state.players.forEach(player => {
        Array(30).fill().forEach(() => {
            const randomCard = cards[Math.floor(Math.random() * cards.length)];

            // Add ownership to cards.
            player.deck$.push(identify({...randomCard, owner$: player.id, location$: player.deck$.id}, ['card'], randomCard.Name).id);
        });
    });

    // Randomize starting player.
    state.currentPlayer = state.players[0];

    // Each Player draws 5 cards from their Deck.
    state.players.forEach(player => {
        Array(5).fill().forEach(() => {
            actions.draw(null, player.deck$);
        });
    });

    console.log('State after initialization:', state);
});