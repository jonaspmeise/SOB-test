// Generate the game board (4x5 grid)
document.addEventListener("DOMContentLoaded", () => {
    const gameBoard = document.getElementById("game-board");

    // Create 4 rows and 5 columns (20 slots)
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.createElement("div");
            slot.classList.add("slot");
            slot.id = `slot-${row}-${col}`;
            slot.textContent = `Slot ${row},${col}`; // Temporary label
            gameBoard.appendChild(slot);
        }
    }

    // Add a click event to the End Turn button (just a placeholder for now)
    const endTurnBtn = document.getElementById("end-turn-btn");
    endTurnBtn.addEventListener("click", () => {
        alert("Turn ended! (This is a placeholder)");
    });
});