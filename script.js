document.addEventListener("DOMContentLoaded", () => {
    const gameBoard = document.getElementById("game-board");
    const turnIndicator = document.getElementById("turn-indicator");
    const endTurnBtn = document.getElementById("end-turn-btn");
    const player1Hand = document.getElementById("player1-hand");
    const player2Hand = document.getElementById("player2-hand");

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

    // Define the card database (sample cards)
    const cardDatabase = [
        {
            id: 1,
            name: "Advocate of the Grove",
            power: 5,
            types: ["Human", "Plant"],
            realms: ["Nature"],
            crystalRequirements: { Nature: 2 },
            image: "assets/advocate-of-the-grove.png"
        },
        {
            id: 2,
            name: "Alchemist’s Incense",
            power: 2,
            types: ["Plant", "Wizard"],
            realms: ["Mortal"],
            crystalRequirements: { Mortal: 1 },
            image: "assets/alchemists-incense.png"
        }
    ];

    // Game state
    let gameState = {
        currentPlayer: 1,
        board: Array(4).fill().map(() => Array(5).fill(null)),
        hands: { 1: [], 2: [] },
        crystalZones: { 1: [], 2: [] },
        realmCounts: { 1: { Divine: 0, Elemental: 0, Mortal: 0, Nature: 0, Void: 0 }, 2: { Divine: 0, Elemental: 0, Mortal: 0, Nature: 0, Void: 0 } },
        decks: { 1: [], 2: [] }
    };

    // Function to shuffle an array (Fisher-Yates shuffle)
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Initialize decks (30 cards each, using the sample cards)
    function initializeDecks() {
        const deck = [];
        for (let i = 0; i < 15; i++) {
            deck.push({ ...cardDatabase[0] }); // 15 copies of Advocate of the Grove
            deck.push({ ...cardDatabase[1] }); // 15 copies of Alchemist’s Incense
        }
        gameState.decks[1] = shuffle([...deck]);
        gameState.decks[2] = shuffle([...deck]);
    }

    // Draw cards into a player’s hand
    function drawCards(player, numCards) {
        const deck = gameState.decks[player];
        const hand = gameState.hands[player];
        const cardsToDraw = Math.min(numCards, deck.length);
        for (let i = 0; i < cardsToDraw; i++) {
            hand.push(deck.pop());
        }
    }

    // Render a player’s hand
    function renderHand(player) {
        const handElement = player === 1 ? player1Hand : player2Hand;
        // Clear existing cards
        handElement.querySelectorAll(".card").forEach(card => card.remove());
        // Add new cards
        gameState.hands[player].forEach(card => {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card");
            cardElement.style.backgroundImage = `url('${card.image}')`;
            cardElement.dataset.cardId = card.id; // Store card ID for later use
            cardElement.addEventListener("click", () => {
                alert(`Clicked ${card.name}! (Player ${player})`); // Placeholder for card interaction
            });
            handElement.appendChild(cardElement);
        });
    }

    // Game setup
    function setupGame() {
        // Initialize decks
        initializeDecks();
        // Draw initial hands (6 cards each)
        drawCards(1, 6);
        drawCards(2, 6);
        // Render hands
        renderHand(1);
        renderHand(2);
        // TODO: Add mulligan functionality (for now, just log the hands)
        console.log("Player 1 Hand:", gameState.hands[1]);
        console.log("Player 2 Hand:", gameState.hands[2]);
    }

    // Function to update the turn indicator
    function updateTurnIndicator() {
        if (gameState.currentPlayer === 1) {
            turnIndicator.style.backgroundImage = "url('assets/player1-icon.png')";
        } else {
            turnIndicator.style.backgroundImage = "url('assets/player2-icon.png')";
        }
    }

    // Initial setup
    setupGame();
    updateTurnIndicator();

    // End Turn button functionality
    endTurnBtn.addEventListener("click", () => {
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        updateTurnIndicator();
        alert(`Player ${gameState.currentPlayer}'s turn! (This is a placeholder)`);
    });
});