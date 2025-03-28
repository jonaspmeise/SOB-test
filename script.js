import { setupGame, endTurn, gameState } from './js/game.js';
import { initializeUI, renderBoard, renderHand, renderCrystalZone, updateDeckCounts, updateTurnIndicator } from './js/ui.js';
import { initializeDecks } from './js/cards.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeDecks();
    setupGame();
    initializeUI();
    renderHand(1);
    renderHand(2);
    renderBoard();
    updateDeckCounts();
    updateTurnIndicator(gameState.currentPlayer);

    // Temporary global references for debugging
    window.globalRenderBoard = renderBoard;
    window.globalRenderCrystalZone = renderCrystalZone;
    window.globalCalculateLaneControl = gameState.calculateLaneControl;
});