document.addEventListener("DOMContentLoaded", () => {
    const gameBoard = document.getElementById("game-board");
    const player1TurnIcon = document.getElementById("player1-turn-icon");
    const player2TurnIcon = document.getElementById("player2-turn-icon");
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

    // Function to update the turn icon
    function updateTurnIcon() {
        if (currentPlayer === 1) {
            player1TurnIcon.style.display = "inline";
            player1TurnIcon.textContent = "⭐"; // Placeholder emoji
            player2TurnIcon.style.display = "none";
        } else {
            player2TurnIcon.style.display = "inline";
            player2TurnIcon.textContent = "⭐"; // Placeholder emoji
            player1TurnIcon.style.display = "none";
        }
    }

    // Initial turn setup
    updateTurnIcon();

    // End Turn button functionality
    endTurnBtn.addEventListener("click", () => {
        currentPlayer = currentPlayer === 1 ? 2 : 1; // Toggle between Player 1 and Player 2
        updateTurnIcon();
        alert(`Player ${currentPlayer}'s turn! (This is a placeholder)`);
    });
});