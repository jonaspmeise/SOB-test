export let gameState = {
    currentPlayer: 1,
    board: Array(4).fill().map(() => Array(5).fill(null)),
    hands: { 1: [], 2: [] },
    crystalZones: { 1: [], 2: [] },
    realmCounts: { 
        1: { Divine: 0, Elemental: 0, Mortal: 0, Nature: 0, Void: 0, Colorless: 0 }, 
        2: { Divine: 0, Elemental: 0, Mortal: 0, Nature: 0, Void: 0, Colorless: 0 } 
    },
    decks: { 1: [], 2: [] },
    laneControl: {
        rows: Array(4).fill(null),
        cols: Array(5).fill(null)
    }
};

export function setupGame() {
    gameState.currentPlayer = 1;
    drawCards(1, 6);
    drawCards(2, 6);
}

export function endTurn() {
    const currentPlayer = gameState.currentPlayer;
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    addLogEntry(`Player ${currentPlayer}'s turn ended`, currentPlayer);
    addLogEntry(`Player ${nextPlayer}'s turn started`, nextPlayer);
    
    gameState.currentPlayer = nextPlayer;
    drawCards(nextPlayer, 1);
    calculateLaneControl();
    if (checkWinCondition()) {
        document.getElementById('end-turn-btn').disabled = true;
        document.querySelectorAll('.deck').forEach(deck => deck.style.pointerEvents = 'none');
    }
}

// Placeholder functions to be implemented or imported
function drawCards(player, count) { /* ... */ }
function calculateLaneControl() { /* ... */ }
function checkWinCondition() { /* ... */ }
function addLogEntry(message, player) { console.log(`Log: ${message}`); }
