import { shuffle } from './utils.js';
import { gameState } from './game.js';

const cardDatabase = [
    // ...existing card data...
];

export function initializeDecks() {
    const deck = [];
    for (let i = 0; i < 15; i++) {
        deck.push({ ...cardDatabase[0] });
        deck.push({ ...cardDatabase[1] });
    }
    gameState.decks[1] = shuffle([...deck]);
    gameState.decks[2] = shuffle([...deck]);
}
