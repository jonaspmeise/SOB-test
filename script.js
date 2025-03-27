document.addEventListener("DOMContentLoaded", () => {
    const gameBoard = document.getElementById("game-board");
    const turnIndicator = document.getElementById("turn-indicator");
    const endTurnBtn = document.getElementById("end-turn-btn");
    const player1Hand = document.getElementById("player1-hand");
    const player2Hand = document.getElementById("player2-hand");
    const player1CrystalZone = document.getElementById("player1-crystal-zone");
    const player2CrystalZone = document.getElementById("player2-crystal-zone");
    const deckPlayer1 = document.getElementById("deck-player1");
    const deckPlayer2 = document.getElementById("deck-player2");
    const deckCountPlayer1 = document.getElementById("deck-count-player1");
    const deckCountPlayer2 = document.getElementById("deck-count-player2");
    const cardPreview = document.getElementById("card-preview");
    const highlightPlayer1Btn = document.getElementById("highlight-player1");
    const highlightPlayer2Btn = document.getElementById("highlight-player2");
    const clearHighlightBtn = document.getElementById("clear-highlight");

    // Create game log
    const logContainer = document.createElement('div');
    logContainer.classList.add('game-log');
    document.body.appendChild(logContainer);

    let highlightedPlayer = null;
    // Generate the game board (4x5 grid)
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.createElement("div");
            slot.classList.add("slot");
            slot.id = `slot-${row}-${col}`;
            slot.dataset.row = row;
            slot.dataset.col = col;
            gameBoard.appendChild(slot);
        }
    }

    // Highlight Player 1's cards
    highlightPlayer1Btn.addEventListener("click", () => {
        highlightedPlayer = 1;
        renderBoard();
    });

    // Highlight Player 2's cards
    highlightPlayer2Btn.addEventListener("click", () => {
        highlightedPlayer = 2;
        renderBoard();
    });

    // Clear highlighting
    clearHighlightBtn.addEventListener("click", () => {
        highlightedPlayer = null;
        renderBoard();
    });

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
            name: "Alchemist's Incense",
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
        hasSummoned: { 1: false, 2: false },
        laneControl: {
            rows: Array(4).fill(null), // null, 1, or 2 for each row (0-3)
            cols: Array(5).fill(null)  // null, 1, or 2 for each column (0-4)
        }
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

    // Draw cards into a player's hand
    function drawCards(player, count) {
        for (let i = 0; i < count; i++) {
            if (gameState.decks[player].length > 0) {
                const card = gameState.decks[player].pop();
                gameState.hands[player].push(card);
                addLogEntry(`Player ${player} drew a card`, player);
            }
        }
        updateDeckCounts();
        renderHand(player);
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

    function renderHand(player) {
        const handElement = player === 1 ? player1Hand : player2Hand;
        handElement.querySelectorAll(".card").forEach(card => card.remove());
        const cards = gameState.hands[player];
    
        cards.forEach((card, index) => {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card");
            // Show cardback for the other player's hand
            if (player !== gameState.currentPlayer) {
                cardElement.style.backgroundImage = `url('assets/cardback.png')`;
                // Mark this card as being in opponent's hand
                card.isInOpponentHand = true;
            } else {
                cardElement.style.backgroundImage = `url('${card.image}')`;
                card.isInOpponentHand = false;
            }
            cardElement.style.width = "100px"; // Fixed size
            cardElement.style.height = "120px";
            cardElement.dataset.cardIndex = index;
            if (canSummonCard(player, card) && !gameState.hasSummoned[player] && player === gameState.currentPlayer) {
                cardElement.classList.add("can-summon");
            }
            cardElement.addEventListener("click", () => showActionMenu(player, index, cardElement));
            cardElement.addEventListener("mouseover", () => showCardPreview(card));
            cardElement.addEventListener("mouseout", hideCardPreview);
            handElement.appendChild(cardElement);
        });
    }

    function renderCrystalZone(player) {
        const crystalZoneElement = player === 1 ? player1CrystalZone : player2CrystalZone;
        crystalZoneElement.querySelectorAll(".card").forEach(card => card.remove());
        const cards = gameState.crystalZones[player];
    
        cards.forEach(card => {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card");
            cardElement.style.backgroundImage = `url('${card.image}')`;
            cardElement.style.width = "100px"; // Fixed size
            cardElement.style.height = "140px";
            cardElement.addEventListener("mouseover", () => showCardPreview(card));
            cardElement.addEventListener("mouseout", hideCardPreview);
            crystalZoneElement.appendChild(cardElement);
        });
    }

   // Render the game board
function renderBoard() {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.getElementById(`slot-${row}-${col}`);
            if (slot) {
                slot.innerHTML = "";
                const card = gameState.board[row][col];
                if (card) {
                    const cardElement = document.createElement("div");
                    cardElement.classList.add("card");
                    cardElement.style.backgroundImage = `url('${card.image}')`;
                    cardElement.style.width = "80px";
                    cardElement.style.height = "112px";

                    // Apply rotation for Player 2's cards
                    if (card.player === 2) {
                        cardElement.style.transform = 'rotate(180deg)';
                        cardElement.style.webkitTransform = 'rotate(180deg)';
                        cardElement.style.mozTransform = 'rotate(180deg)';
                    }

                    // Apply highlighting
                    if (highlightedPlayer === 1 && card.player === 1) {
                        cardElement.classList.add("highlight-player1");
                    } else if (highlightedPlayer === 2 && card.player === 2) {
                        cardElement.classList.add("highlight-player2");
                    }

                    cardElement.addEventListener("mouseover", () => showCardPreview(card));
                    cardElement.addEventListener("mouseout", hideCardPreview);
                    slot.appendChild(cardElement);
                }
            }
        }
    }
}

    // Show the action menu (Crystallize/Summon)
    function showActionMenu(player, cardIndex, cardElement) {
        if (player !== gameState.currentPlayer) {
            return; // Silently ignore if it's not the player's turn
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

        // Add log entry after crystallization
        addLogEntry(`Player ${player} crystallized ${card.name}`, player);
    }

  // Start the summon process
function startSummon(player, cardIndex) {
    const card = gameState.hands[player][cardIndex];
    if (!canSummonCard(player, card)) {
        return; // Silently ignore if the card can't be summoned
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
                // Remove any existing click listeners to prevent stacking
                slot.removeEventListener("click", slot._summonHandler);
                slot._summonHandler = function summonHandler() {
                    summonCard(player, cardIndex, row, col);
                    // No need to call clearHighlights here since summonCard will handle it
                };
                slot.addEventListener("click", slot._summonHandler);
            }
        }
    }
}

// Clear highlights from the board
function clearHighlights() {
    console.log("Clearing highlights from the board"); // Debug log
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.getElementById(`slot-${row}-${col}`);
            slot.style.backgroundColor = "transparent";
            slot.style.cursor = "default";
            slot.removeEventListener("click", slot._summonHandler);
            delete slot._summonHandler; // Ensure the handler is fully removed
        }
    }
}

// Summon a card to the board
function summonCard(player, cardIndex, row, col) {
    const hand = gameState.hands[player];
    const card = hand[cardIndex];
    card.player = player;
    gameState.board[row][col] = card;
    hand.splice(cardIndex, 1);
    gameState.hasSummoned[player] = true;
    renderHand(player);

    // Clear highlights before rendering the board
    clearHighlights();
    renderBoard();

    // Add log entry with chess notation
    const position = slotToChessNotation(`slot-${row}-${col}`);
    addLogEntry(`Player ${player} summoned ${card.name} to ${position}`, player);

    // Calculate lane control after summoning
    calculateLaneControl();
}

    // Game setup
    function setupGame() {
        initializeDecks();
        drawCards(1, 6);
        drawCards(2, 6);
        renderHand(1);
        renderHand(2);
        updateDeckCounts(); // Initialize deck counts
        console.log("Player 1 Hand:", gameState.hands[1]);
        console.log("Player 2 Hand:", gameState.hands[2]);
    }

    // Update deck counts
    function updateDeckCounts() {
        deckCountPlayer1.textContent = gameState.decks[1].length;
        deckCountPlayer2.textContent = gameState.decks[2].length;
    }

    // Add click events for the decks
    deckPlayer1.addEventListener("click", () => {
        if (gameState.currentPlayer !== 1) return; // Only allow the current player to draw
        drawCards(1, 1);
        renderHand(1);
        updateDeckCounts();
    });

    deckPlayer2.addEventListener("click", () => {
        if (gameState.currentPlayer !== 2) return; // Only allow the current player to draw
        drawCards(2, 1);
        renderHand(2);
        updateDeckCounts();
    });

    // Function to update the turn indicator
    function updateTurnIndicator(player) {
        const indicator = document.querySelector('.turn-indicator');
        const player1Area = document.querySelector('.player-1-area');
        const player2Area = document.querySelector('.player-2-area');
        
        // Move indicator to current player's area
        if (player === 1) {
            player1Area.appendChild(indicator);
        } else {
            player2Area.appendChild(indicator);
        }
    }

    // Reset actions at the start of a turn
    function resetActions(player) {
        gameState.hasCrystallized[player] = false;
        gameState.hasSummoned[player] = false;
    }

    // Initial setup
    setupGame();
    updateTurnIndicator(gameState.currentPlayer);

    // End Turn button functionality
    endTurnBtn.addEventListener("click", endTurn);

    function endTurn() {
        console.log("Starting endTurn function");
        const currentPlayer = gameState.currentPlayer;
        const nextPlayer = currentPlayer === 1 ? 2 : 1;
        
        // Move logging here, before any game state changes
        addLogEntry(`Player ${currentPlayer}'s turn ended`, currentPlayer);
        addLogEntry(`Player ${nextPlayer}'s turn started`, nextPlayer);
        
        console.log(`Ending turn for Player ${currentPlayer}, starting turn for Player ${nextPlayer}`);
        
        if (!(currentPlayer === 1 && gameState.hasCrystallized[1] === false && gameState.hasSummoned[1] === false)) {
            console.log("Drawing cards for next player:", nextPlayer);
            drawCards(nextPlayer, 1);
            renderHand(nextPlayer);
        }
        
        console.log("Updating game state for next player:", nextPlayer); // Debug log
        gameState.currentPlayer = nextPlayer;
        resetActions(gameState.currentPlayer);
        updateTurnIndicator(gameState.currentPlayer);
        clearHighlights();
        updateDeckCounts();
        renderHand(nextPlayer);
        renderHand(gameState.currentPlayer === 1 ? 2 : 1);
        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());
    
        console.log("Calculating lane control and checking win condition"); // Debug log
        calculateLaneControl();
        if (checkWinCondition()) {
            console.log("Win condition met, disabling actions"); // Debug log
            endTurnBtn.disabled = true;
            document.querySelectorAll(".deck").forEach(deck => deck.style.pointerEvents = "none");
        }
    
        console.log("Finished endTurn function"); // Debug log
    }
    
    // Keep track of the currently previewed card
    let currentPreviewCard = null;

    // Function to show the card preview
    function showCardPreview(card) {
        // Don't show preview for opponent's hand cards
        if (card.isInOpponentHand) {
            return;
        }
        
        console.log("Showing preview for card:", card.name);
        currentPreviewCard = card;
        cardPreview.style.backgroundImage = `url('${card.image}')`;
        cardPreview.style.display = "block";
    }

    // Function to hide the card preview
    function hideCardPreview() {
        console.log("Hiding Preview");
        if (!currentPreviewCard) {
        cardPreview.style.display = "none";
        }
    }
}); // Close the DOMContentLoaded event listener

// Moved outside the DOMContentLoaded event listener
function calculateLaneControl() {
    let player1Lanes = 0;
    let player2Lanes = 0;

    // Clear previous lane control indicators
    document.querySelectorAll(".lane").forEach(lane => {
        lane.classList.remove("lane-controlled-player1", "lane-controlled-player2");
    });

    // Check horizontal lanes (rows)
    for (let row = 0; row < 4; row++) {
        let isFull = true;
        let player1Power = 0;
        let player2Power = 0;

        for (let col = 0; col < 5; col++) {
            const card = gameState.board[row][col];
            if (!card) {
                isFull = false;
                continue;
            }
            if (card.player === 1) {
                player1Power += card.power;
            } else if (card.player === 2) {
                player2Power += card.power;
            }
        }

        if (isFull) {
            const laneElement = document.getElementById(`lane-row-${row}`);
            const previousOwner = gameState.laneControl.rows[row];
            let newOwner = null;

            if (player1Power > player2Power) {
                player1Lanes++;
                laneElement.classList.add("lane-controlled-player1");
                laneElement.classList.remove("lane-controlled-player2");
                newOwner = 1;
            } else if (player2Power > player1Power) {
                player2Lanes++;
                laneElement.classList.add("lane-controlled-player2");
                laneElement.classList.remove("lane-controlled-player1");
                newOwner = 2;
            }

            // Log lane control change if ownership changed
            if (newOwner !== previousOwner) {
                const laneName = ['4', '3', '2', '1'][row]; // Chess notation for rows
                if (newOwner) {
                    addLogEntry(`Player ${newOwner} gained control of lane ${laneName}`, newOwner);
                } else if (previousOwner) {
                    addLogEntry(`Lane ${laneName} is no longer controlled`, 0);
                }
            }
            gameState.laneControl.rows[row] = newOwner;
        } else {
            // If the lane is not full, clear control
            if (gameState.laneControl.rows[row] !== null) {
                const laneName = ['4', '3', '2', '1'][row];
                addLogEntry(`Lane ${laneName} is no longer controlled`, 0);
                gameState.laneControl.rows[row] = null;
            }
        }
    }

    // Check vertical lanes (columns)
    for (let col = 0; col < 5; col++) {
        let isFull = true;
        let player1Power = 0;
        let player2Power = 0;

        for (let row = 0; row < 4; row++) {
            const card = gameState.board[row][col];
            if (!card) {
                isFull = false;
                continue;
            }
            if (card.player === 1) {
                player1Power += card.power;
            } else if (card.player === 2) {
                player2Power += card.power;
            }
        }

        if (isFull) {
            const laneElement = document.getElementById(`lane-col-${col}`);
            const previousOwner = gameState.laneControl.cols[col];
            let newOwner = null;

            if (player1Power > player2Power) {
                player1Lanes++;
                laneElement.classList.add("lane-controlled-player1");
                laneElement.classList.remove("lane-controlled-player2");
                newOwner = 1;
            } else if (player2Power > player1Power) {
                player2Lanes++;
                laneElement.classList.add("lane-controlled-player2");
                laneElement.classList.remove("lane-controlled-player1");
                newOwner = 2;
            }

            // Log lane control change if ownership changed
            if (newOwner !== previousOwner) {
                const laneName = ['a', 'b', 'c', 'd', 'e'][col]; // Chess notation for columns
                if (newOwner) {
                    addLogEntry(`Player ${newOwner} gained control of lane ${laneName}`, newOwner);
                } else if (previousOwner) {
                    addLogEntry(`Lane ${laneName} is no longer controlled`, 0);
                }
            }
            gameState.laneControl.cols[col] = newOwner;
        } else {
            // If the lane is not full, clear control
            if (gameState.laneControl.cols[col] !== null) {
                const laneName = ['a', 'b', 'c', 'd', 'e'][col];
                addLogEntry(`Lane ${laneName} is no longer controlled`, 0);
                gameState.laneControl.cols[col] = null;
            }
        }
    }

    // Update lane control stats display
    document.getElementById("player1-stats").textContent = `Player 1: ${player1Lanes}`;
    document.getElementById("player2-stats").textContent = `Player 2: ${player2Lanes}`;

    // Remove the generic "Lane control update" message since we now have specific messages
    return { player1: player1Lanes, player2: player2Lanes };
}

function checkWinCondition() {
    const { player1Lanes, player2Lanes } = calculateLaneControl();
    if (player1Lanes >= 4) {
        alert("Player 1 Wins!");
        return true;
    } else if (player2Lanes >= 4) {
        alert("Player 2 Wins!");
        return true;
    }
    return false;
}

// Add click events for the decks and set cardback image
deckPlayer1.style.backgroundImage = "url('assets/cardback.png')";
deckPlayer2.style.backgroundImage = "url('assets/cardback.png')";

// Add this simple logging function
function addLogEntry(message, player) {
    console.log("Adding log entry:", message, "for player:", player); // Debug log
    const logContainer = document.querySelector('.game-log');
    if (logContainer) {
        const entry = document.createElement('div');
        entry.classList.add('log-entry');
        
        // Create timestamp
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        // Add timestamp to message
        const fullMessage = `[${timestamp}] ${message}`;
        
        if (player) {
            entry.classList.add(`player${player}`);
        }
        entry.textContent = fullMessage;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
        console.log("Log entry added successfully:", fullMessage); // Debug log
    } else {
        console.error("Log container not found!");
    }
}

// Helper function to convert slot ID to chess notation
function slotToChessNotation(slotId) {
    // Convert "slot-0-0" format to "a1" format
    const [_, row, col] = slotId.split('-');
    const columns = ['a', 'b', 'c', 'd', 'e'];
    const rows = ['4', '3', '2', '1']; // Reversed order since our grid starts from top
    return columns[col] + rows[row];
}

function placeCardOnBoard(player, cardIndex, slotId) {
    // ... existing code ...
    
    // Update game state
    gameState.hands[player].splice(cardIndex, 1);
    gameState.board[slotId] = { ...card, player: player };
    gameState.hasSummoned[player] = true;
    
    // Update UI
    renderHand(player);
    updateSummonableCards();
    calculateLaneControl(); // Make sure this is called
    
    // ... rest of the code ...
}

function endTurn() {
    // ... existing code ...
    
    calculateLaneControl(); // Make sure lane control is updated at end of turn
    
    if (checkWinCondition()) {
        endTurnBtn.disabled = true;
        document.querySelectorAll(".deck").forEach(deck => deck.style.pointerEvents = "none");
    }
}