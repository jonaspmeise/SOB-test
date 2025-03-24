document.addEventListener("DOMContentLoaded", () => {
    const gameBoard = document.getElementById("game-board");
    const turnIndicator = document.getElementById("turn-indicator");
    const endTurnBtn = document.getElementById("end-turn-btn");
    const player1Hand = document.getElementById("player1-hand");
    const player2Hand = document.getElementById("player2-hand");
    const player1CrystalZone = document.getElementById("player1-crystal-zone");
    const player2CrystalZone = document.getElementById("player2-crystal-zone");

    // Generate the game board (4x5 grid)
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.createElement("div");
            slot.classList.add("slot");
            slot.id = `slot-${row}-${col}`;
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
        decks: { 1: [], 2: [] },
        hasCrystallized: { 1: false, 2: false },
        hasSummoned: { 1: false, 2: false }
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
            deck.push({ ...cardDatabase[0] });
            deck.push({ ...cardDatabase[1] });
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

    // Check if a card can be summoned
    function canSummonCard(player, card) {
        const requirements = card.crystalRequirements;
        for (const [realm, required] of Object.entries(requirements)) {
            if (gameState.realmCounts[player][realm] < required) {
                return false;
            }
        }
        return true;
    }

    // Render a player’s hand and highlight summonable cards
    function renderHand(player) {
        const handElement = player === 1 ? player1Hand : player2Hand;
        handElement.querySelectorAll(".card").forEach(card => card.remove());
        gameState.hands[player].forEach((card, index) => {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card");
            cardElement.style.backgroundImage = `url('${card.image}')`;
            cardElement.dataset.cardIndex = index;
            // Highlight if the card can be summoned and the player hasn’t summoned yet
            if (canSummonCard(player, card) && !gameState.hasSummoned[player]) {
                cardElement.classList.add("can-summon");
            }
            cardElement.addEventListener("click", () => showActionMenu(player, index, cardElement));
            handElement.appendChild(cardElement);
        });
    }

    // Render a player’s Crystal Zone
    function renderCrystalZone(player) {
        const crystalZoneElement = player === 1 ? player1CrystalZone : player2CrystalZone;
        crystalZoneElement.querySelectorAll(".card").forEach(card => card.remove());
        gameState.crystalZones[player].forEach(card => {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card");
            cardElement.style.backgroundImage = `url('${card.image}')`;
            crystalZoneElement.appendChild(cardElement);
        });
    }

    // Render the game board
    function renderBoard() {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const slot = document.getElementById(`slot-${row}-${col}`);
                slot.innerHTML = "";
                const card = gameState.board[row][col];
                if (card) {
                    const cardElement = document.createElement("div");
                    cardElement.classList.add("card");
                    cardElement.style.backgroundImage = `url('${card.image}')`;
                    slot.appendChild(cardElement);
                }
            }
        }
    }

    // Show the action menu (Crystallize/Summon)
    function showActionMenu(player, cardIndex, cardElement) {
        if (player !== gameState.currentPlayer) {
            return; // Silently ignore if it’s not the player’s turn
        }

        if (gameState.hasCrystallized[player] && gameState.hasSummoned[player]) {
            return; // Silently ignore if both actions are used
        }

        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());

        const menu = document.createElement("div");
        menu.classList.add("action-menu");

        const rect = cardElement.getBoundingClientRect();
        menu.style.left = `${rect.right + 5}px`;
        menu.style.top = `${rect.top}px`;

        if (!gameState.hasCrystallized[player]) {
            const crystallizeBtn = document.createElement("button");
            crystallizeBtn.textContent = "Crystallize";
            crystallizeBtn.addEventListener("click", () => {
                crystallizeCard(player, cardIndex);
                menu.remove();
            });
            menu.appendChild(crystallizeBtn);
        }

        if (!gameState.hasSummoned[player]) {
            const summonBtn = document.createElement("button");
            summonBtn.textContent = "Summon";
            summonBtn.addEventListener("click", () => {
                startSummon(player, cardIndex);
                menu.remove();
            });
            menu.appendChild(summonBtn);
        }

        document.body.appendChild(menu);
        menu.style.display = "block";

        document.addEventListener("click", function closeMenu(event) {
            if (!menu.contains(event.target) && event.target !== cardElement) {
                menu.remove();
                document.removeEventListener("click", closeMenu);
            }
        });
    }

    // Crystallize a card
    function crystallizeCard(player, cardIndex) {
        const hand = gameState.hands[player];
        const card = hand[cardIndex];
        gameState.crystalZones[player].push(card);
        hand.splice(cardIndex, 1);

        card.realms.forEach(realm => {
            gameState.realmCounts[player][realm]++;
        });

        gameState.hasCrystallized[player] = true;
        renderHand(player);
        renderCrystalZone(player);
        console.log(`Player ${player} Realm Counts:`, gameState.realmCounts[player]);
    }

    // Start the summon process
    function startSummon(player, cardIndex) {
        const card = gameState.hands[player][cardIndex];
        if (!canSummonCard(player, card)) {
            return; // Silently ignore if the card can’t be summoned
        }

        highlightEmptySlots(player, cardIndex);
    }

    // Highlight empty slots on the board
    function highlightEmptySlots(player, cardIndex) {
        const highlightColor = player === 1 ? "rgba(255, 0, 0, 0.3)" : "rgba(0, 0, 255, 0.3)";
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                if (!gameState.board[row][col]) {
                    const slot = document.getElementById(`slot-${row}-${col}`);
                    slot.style.backgroundColor = highlightColor;
                    slot.style.cursor = "pointer";
                    slot.addEventListener("click", function summonHandler() {
                        summonCard(player, cardIndex, row, col);
                        clearHighlights();
                        slot.removeEventListener("click", summonHandler);
                    });
                }
            }
        }
    }

    // Clear highlights from the board
    function clearHighlights() {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const slot = document.getElementById(`slot-${row}-${col}`);
                slot.style.backgroundColor = "transparent";
                slot.style.cursor = "default";
            }
        }
    }

    // Summon a card to the board
    function summonCard(player, cardIndex, row, col) {
        const hand = gameState.hands[player];
        const card = hand[cardIndex];
        gameState.board[row][col] = card;
        hand.splice(cardIndex, 1);
        gameState.hasSummoned[player] = true;
        renderHand(player);
        renderBoard();
    }

    // Game setup
    function setupGame() {
        initializeDecks();
        drawCards(1, 6);
        drawCards(2, 6);
        renderHand(1);
        renderHand(2);
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

    // Reset actions at the start of a turn
    function resetActions(player) {
        gameState.hasCrystallized[player] = false;
        gameState.hasSummoned[player] = false;
    }

    // Initial setup
    setupGame();
    updateTurnIndicator();

    // End Turn button functionality
    endTurnBtn.addEventListener("click", () => {
        const nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        if (!(gameState.currentPlayer === 1 && gameState.hasCrystallized[1] === false && gameState.hasSummoned[1] === false)) {
            drawCards(nextPlayer, 1);
            renderHand(nextPlayer);
        }
        gameState.currentPlayer = nextPlayer;
        resetActions(gameState.currentPlayer);
        updateTurnIndicator();
        clearHighlights();
        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());
    });
});