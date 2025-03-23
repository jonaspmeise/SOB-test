document.addEventListener("DOMContentLoaded", () => {
    const gameBoard = document.getElementById("game-board");
    const turnIndicator = document.getElementById("turn-indicator");
    const endTurnBtn = document.getElementById("end-turn-btn");

    // Generate the game board (4x5 grid)
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.createElement("div");
            slot.classList.add("slot");
            slot.id = `slot-${row}-${col}`;
            slot.textContent = `Slot ${row},${col}`;
            gameBoard.appendChild(slot);
        }
    }

    // Game state to track the current player
    let currentPlayer = 1;

    // Function to update the turn indicator
    function updateTurnIndicator() {
        if (currentPlayer === 1) {
            turnIndicator.style.backgroundImage = "url('assets/player1-icon.png')";
        } else {
            turnIndicator.style.backgroundImage = "url('assets/player2-icon.png')";
        }
    }

    // Initial turn setup
    updateTurnIndicator();

    // End Turn button functionality
    endTurnBtn.addEventListener("click", () => {
        currentPlayer = currentPlayer === 1 ? 2 : 1; // Toggle between Player 1 and Player 2
        updateTurnIndicator();
        alert(`Player ${currentPlayer}'s turn! (This is a placeholder)`);
    });
});