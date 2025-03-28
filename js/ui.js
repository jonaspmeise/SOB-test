import { gameState, endTurn } from './game.js';

export function initializeUI() {
    const elements = {
        gameBoard: document.getElementById('game-board'),
        endTurnBtn: document.getElementById('end-turn-btn'),
        deckPlayer1: document.getElementById('deck-player1'),
        deckPlayer2: document.getElementById('deck-player2'),
        highlightPlayer1Btn: document.getElementById('highlight-player1'),
        highlightPlayer2Btn: document.getElementById('highlight-player2'),
        clearHighlightBtn: document.getElementById('clear-highlight')
    };

    // Generate board
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.id = `slot-${row}-${col}`;
            elements.gameBoard.appendChild(slot);
        }
    }

    // Event listeners
    elements.endTurnBtn.addEventListener('click', endTurn);
    elements.highlightPlayer1Btn.addEventListener('click', () => { highlightedPlayer = 1; renderBoard(); });
    elements.highlightPlayer2Btn.addEventListener('click', () => { highlightedPlayer = 2; renderBoard(); });
    elements.clearHighlightBtn.addEventListener('click', () => { highlightedPlayer = null; renderBoard(); });
}

export function renderBoard() { /* ... */ }
export function renderHand(player) { /* ... */ }
export function renderCrystalZone(player) { /* ... */ }
export function updateDeckCounts() { /* ... */ }
export function updateTurnIndicator(player) { /* ... */ }
export function addLogEntry(message, player) { /* ... */ }

let highlightedPlayer = null;
