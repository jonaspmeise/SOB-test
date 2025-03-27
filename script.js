// Define gameState globally so it's accessible from all functions
let gameState = {
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
        rows: Array(4).fill(null), // null, 1, or 2 for each row (0-3)
        cols: Array(5).fill(null)  // null, 1, or 2 for each column (0-4)
    }
};

// Global variables needed by functions outside the DOMContentLoaded event
let highlightedPlayer = null;
let globalRenderBoard;
let globalRenderCrystalZone;
let globalCalculateLaneControl;

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
        },
        {
            id: 3,
            name: "Mystic Wanderer",
            power: 3,
            types: ["Human", "Wizard"],
            realms: ["Divine"],
            crystalRequirements: { Divine: 1, Colorless: 1 },  // 1 Divine and 1 of any realm
            image: "assets/advocate-of-the-grove.png"  // Reusing image for demo
        },
        {
            id: 4,
            name: "Ancient Artifact",
            power: 4,
            types: ["Artifact"],
            realms: ["Colorless"],  // A fully colorless card
            crystalRequirements: { Colorless: 2 },  // 2 of any realm
            image: "assets/alchemists-incense.png"  // Reusing image for demo
        },
        {
            id: 5,
            name: "Divine Void Speaker",
            power: 6,
            types: ["Human", "Spirit"],
            realms: ["Divine", "Void"],  // Dual-realm card
            crystalRequirements: { Divine: 1, Void: 1 },
            image: "assets/advocate-of-the-grove.png"  // Reusing image for demo
        },
        {
            id: 6,
            name: "Elemental Nature Guardian",
            power: 4,
            types: ["Elemental", "Plant"],
            realms: ["Elemental", "Nature"],  // Dual-realm card
            crystalRequirements: { Elemental: 1, Nature: 1 },
            image: "assets/alchemists-incense.png"  // Reusing image for demo
        }
    ];

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
                const card = gameState.decks[player].shift(); // Always draw from the top (front) of the deck
                const cardToHand = {...card}; // Create a copy of the card
                cardToHand.player = player; // Ensure player ownership
                gameState.hands[player].push(cardToHand);
                addLogEntry(`Player ${player} drew a card`, player); // Don't reveal which card was drawn
            }
        }
        updateDeckCounts();
        renderHand(player);
    }

    // Check if a card can be summoned
    function canSummonCard(player, card) {
        console.log(`Checking if player ${player} can summon card ${card.name}...`);
        const requirements = card.crystalRequirements;
        console.log(`Crystal requirements:`, requirements);
        
        // First, get a list of all crystal cards with their available realms
        const crystalCards = gameState.crystalZones[player].map(card => ({
            id: Math.random(), // Unique ID to track each card
            realms: card.realms // The realm(s) this card provides
        }));
        
        console.log(`Player ${player} has ${crystalCards.length} crystals:`, 
            crystalCards.map(c => c.realms.join('/')));
        
        // Track which crystal cards have been used
        const usedCrystalIds = new Set();
        
        // Check each realm requirement
        for (const [requiredRealm, requiredCount] of Object.entries(requirements)) {
            if (requiredRealm === 'Colorless') continue; // Handle colorless separately
            
            console.log(`Checking requirement: ${requiredCount} ${requiredRealm}`);
            let availableCount = 0;
            
            // First, try to use single-realm cards matching the required realm
            for (const crystal of crystalCards) {
                if (usedCrystalIds.has(crystal.id)) continue; // Skip if already used
                
                // If this is a single-realm card that matches the requirement
                if (crystal.realms.length === 1 && crystal.realms[0] === requiredRealm) {
                    usedCrystalIds.add(crystal.id);
                    availableCount++;
                    console.log(`Used single-realm ${requiredRealm} crystal. Count: ${availableCount}/${requiredCount}`);
                    
                    if (availableCount >= requiredCount) break; // We have enough
                }
            }
            
            // If we still need more, try to use multi-realm cards that include this realm
            if (availableCount < requiredCount) {
                for (const crystal of crystalCards) {
                    if (usedCrystalIds.has(crystal.id)) continue; // Skip if already used
                    
                    // If this is a multi-realm card that includes the required realm
                    if (crystal.realms.length > 1 && crystal.realms.includes(requiredRealm)) {
                        usedCrystalIds.add(crystal.id);
                        availableCount++;
                        console.log(`Used multi-realm crystal containing ${requiredRealm}. Count: ${availableCount}/${requiredCount}`);
                        
                        if (availableCount >= requiredCount) break; // We have enough
                    }
                }
            }
            
            // Check if we have enough
            if (availableCount < requiredCount) {
                console.log(`Not enough ${requiredRealm}. Have ${availableCount}, need ${requiredCount}`);
                return false; // Not enough of this realm
            }
        }
        
        // Handle colorless requirements
        const colorlessRequired = requirements.Colorless || 0;
        if (colorlessRequired > 0) {
            console.log(`Checking colorless requirement: ${colorlessRequired}`);
            let remainingColorless = colorlessRequired;
            
            // Use remaining unused crystals for colorless requirements
            for (const crystal of crystalCards) {
                if (usedCrystalIds.has(crystal.id)) continue; // Skip if already used
                
                usedCrystalIds.add(crystal.id);
                remainingColorless--;
                console.log(`Used a crystal for colorless requirement. Remaining: ${remainingColorless}`);
                
                if (remainingColorless <= 0) break; // We have enough
            }
            
            if (remainingColorless > 0) {
                console.log(`Not enough crystals for colorless requirements. Need ${remainingColorless} more`);
                return false; // Not enough crystals for colorless requirements
            }
        }
        
        console.log(`Player ${player} CAN summon ${card.name}!`);
        return true;
    }

    function renderHand(player) {
        console.log(`Rendering hand for player ${player}`);
        const handElement = player === 1 ? player1Hand : player2Hand;
        handElement.querySelectorAll(".card").forEach(card => card.remove());
        const cards = gameState.hands[player];
        
        console.log(`Player ${player} has ${cards.length} cards in hand`);
    
        cards.forEach((card, index) => {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card");
            // Show cardback for the other player's hand
            if (player !== gameState.currentPlayer) {
                console.log(`Card ${card.name} belongs to non-current player, showing cardback`);
                cardElement.style.backgroundImage = `url('assets/cardback.png')`;
                // Mark this card as being in opponent's hand
                card.isInOpponentHand = true;
            } else {
                console.log(`Showing card ${card.name} face-up for current player ${player}`);
                cardElement.style.backgroundImage = `url('${card.image}')`;
                card.isInOpponentHand = false;
                
                // Only add the summon highlight for the current player's cards
                if (canSummonCard(player, card)) {
                    console.log(`Card ${card.name} CAN be summoned, adding highlight`);
                    cardElement.classList.add("can-summon");
                } else {
                    console.log(`Card ${card.name} CANNOT be summoned, no highlight`);
                }
            }
            cardElement.style.width = "100px"; // Fixed size
            cardElement.style.height = "120px";
            cardElement.dataset.cardIndex = index;
            
            // Only the current player can interact with their cards
            if (player === gameState.currentPlayer) {
                console.log(`Adding click handler for card ${card.name} (current player)`);
                cardElement.addEventListener("click", () => showActionMenu(player, index, cardElement));
            }
            
            cardElement.addEventListener("mouseover", () => showCardPreview(card));
            cardElement.addEventListener("mouseout", hideCardPreview);
            handElement.appendChild(cardElement);
        });
    }

    function renderCrystalZone(player) {
        const crystalZoneElement = player === 1 ? player1CrystalZone : player2CrystalZone;
        crystalZoneElement.querySelectorAll(".card").forEach(card => card.remove());
        const cards = gameState.crystalZones[player];
    
        cards.forEach((card, index) => {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card");
            
            // Use cardback for buried cards, otherwise normal card image
            if (card.isBuried) {
                cardElement.style.backgroundImage = `url('assets/cardback.png')`;
                
                // Add a label with the card name for buried cards
                const nameLabel = document.createElement("div");
                nameLabel.classList.add("card-name-label");
                nameLabel.textContent = card.name;
                nameLabel.style.position = "absolute";
                nameLabel.style.top = "50%";
                nameLabel.style.left = "50%";
                nameLabel.style.transform = "translate(-50%, -50%)";
                nameLabel.style.width = "90%";
                nameLabel.style.textAlign = "center";
                nameLabel.style.backgroundColor = "rgba(0,0,0,0.7)";
                nameLabel.style.color = "white";
                nameLabel.style.padding = "5px";
                nameLabel.style.fontSize = "14px";
                nameLabel.style.fontWeight = "bold";
                nameLabel.style.borderRadius = "3px";
                nameLabel.style.wordWrap = "break-word";
                
                cardElement.appendChild(nameLabel);
            } else {
                cardElement.style.backgroundImage = `url('${card.image}')`;
            }
            
            cardElement.style.width = "100px"; // Fixed size
            cardElement.style.height = "140px";
            cardElement.style.position = "relative";
            
            // Add a visual indicator for the realm(s)
            const realmIndicator = document.createElement("div");
            realmIndicator.classList.add("realm-indicator");
            
            // If card is buried, show "Colorless" realm
            if (card.isBuried) {
                realmIndicator.textContent = "Colorless (Buried)";
            } else {
                realmIndicator.textContent = card.realms.join(", ");
            }
            
            realmIndicator.style.position = "absolute";
            realmIndicator.style.bottom = "5px";
            realmIndicator.style.left = "5px";
            realmIndicator.style.right = "5px";
            realmIndicator.style.backgroundColor = "rgba(0,0,0,0.7)";
            realmIndicator.style.color = "white";
            realmIndicator.style.padding = "2px 5px";
            realmIndicator.style.borderRadius = "3px";
            realmIndicator.style.fontSize = "10px";
            realmIndicator.style.textAlign = "center";
            
            cardElement.appendChild(realmIndicator);
            
            // Add "buried" visual indicator if the card is buried
            if (card.isBuried) {
                cardElement.classList.add("buried-card");
                // Add a semi-transparent overlay to indicate buried status
                const buriedOverlay = document.createElement("div");
                buriedOverlay.classList.add("buried-overlay");
                buriedOverlay.style.position = "absolute";
                buriedOverlay.style.top = "0";
                buriedOverlay.style.left = "0";
                buriedOverlay.style.width = "100%";
                buriedOverlay.style.height = "100%";
                buriedOverlay.style.backgroundColor = "rgba(0,0,0,0.4)";
                buriedOverlay.style.zIndex = "1";
                buriedOverlay.style.pointerEvents = "none"; // Allow clicks to pass through
                cardElement.appendChild(buriedOverlay);
            }
            
            cardElement.addEventListener("mouseover", () => showCardPreview(card));
            cardElement.addEventListener("mouseout", hideCardPreview);
            cardElement.addEventListener("click", () => showCardInPlayMenu(player, card, cardElement, "crystalZone", index));
            crystalZoneElement.appendChild(cardElement);
        });
    }

   // Render the game board
function renderBoard() {
    console.log("Rendering board");
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.getElementById(`slot-${row}-${col}`);
            if (slot) {
                slot.innerHTML = "";
                const card = gameState.board[row][col];
                if (card) {
                    console.log(`Found card at slot-${row}-${col}:`, card.name);
                    const cardElement = document.createElement("div");
                    cardElement.classList.add("card");
                    
                    // Use cardback for buried cards, otherwise normal card image
                    if (card.isBuried) {
                        cardElement.style.backgroundImage = `url('assets/cardback.png')`;
                        
                        // Add a label with the card name for buried cards
                        const nameLabel = document.createElement("div");
                        nameLabel.classList.add("card-name-label");
                        nameLabel.textContent = card.name;
                        nameLabel.style.position = "absolute";
                        nameLabel.style.top = "50%";
                        nameLabel.style.left = "50%";
                        nameLabel.style.transform = "translate(-50%, -50%)";
                        nameLabel.style.width = "90%";
                        nameLabel.style.textAlign = "center";
                        nameLabel.style.backgroundColor = "rgba(0,0,0,0.7)";
                        nameLabel.style.color = "white";
                        nameLabel.style.padding = "5px";
                        nameLabel.style.fontSize = "14px";
                        nameLabel.style.fontWeight = "bold";
                        nameLabel.style.borderRadius = "3px";
                        nameLabel.style.wordWrap = "break-word";
                        
                        // Position relatively to add the label
                        cardElement.style.position = "relative";
                        cardElement.appendChild(nameLabel);
                    } else {
                        cardElement.style.backgroundImage = `url('${card.image}')`;
                    }
                    
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
                    
                    // Add "buried" visual indicator if the card is buried
                    if (card.isBuried) {
                        cardElement.classList.add("buried-card");
                        // Add a semi-transparent overlay to indicate buried status
                        const buriedOverlay = document.createElement("div");
                        buriedOverlay.classList.add("buried-overlay");
                        buriedOverlay.style.position = "absolute";
                        buriedOverlay.style.top = "0";
                        buriedOverlay.style.left = "0";
                        buriedOverlay.style.width = "100%";
                        buriedOverlay.style.height = "100%";
                        buriedOverlay.style.backgroundColor = "rgba(0,0,0,0.4)";
                        buriedOverlay.style.zIndex = "1";
                        buriedOverlay.style.pointerEvents = "none"; // Allow clicks to pass through
                        cardElement.appendChild(buriedOverlay);
                    }

                    cardElement.addEventListener("mouseover", () => showCardPreview(card));
                    cardElement.addEventListener("mouseout", hideCardPreview);
                    cardElement.addEventListener("click", () => {
                        console.log(`Card clicked at slot-${row}-${col}:`, card.name);
                        // Store the position data directly on the card for easier access
                        card.boardRow = row;
                        card.boardCol = col;
                        showCardInPlayMenu(card.player, card, cardElement, "board", `slot-${row}-${col}`);
                    });
                    slot.appendChild(cardElement);
                }
            }
        }
    }
    console.log("Board rendering complete");
}

    // Show the action menu (Crystallize/Summon)
    function showActionMenu(player, cardIndex, cardElement) {
        if (player !== gameState.currentPlayer) {
            return; // Silently ignore if it's not the player's turn
        }

        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());

        const menu = document.createElement("div");
        menu.classList.add("action-menu");

        const rect = cardElement.getBoundingClientRect();
        menu.style.left = `${rect.right + 5}px`;
        menu.style.top = `${rect.top}px`;

        const crystallizeBtn = document.createElement("button");
        crystallizeBtn.textContent = "Crystallize";
        crystallizeBtn.addEventListener("click", () => {
            crystallizeCard(player, cardIndex);
            menu.remove();
        });
        menu.appendChild(crystallizeBtn);

        const summonBtn = document.createElement("button");
        summonBtn.textContent = "Summon";
        summonBtn.addEventListener("click", () => {
            startSummon(player, cardIndex);
            menu.remove();
        });
        menu.appendChild(summonBtn);

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
        
        // Add card to crystal zone (preserving all realms)
        const cardCopy = { ...card };
        gameState.crystalZones[player].push(cardCopy);
        hand.splice(cardIndex, 1);
        
        // Increment realm counts for all realms
        card.realms.forEach(realm => {
            gameState.realmCounts[player][realm]++;
        });
        
        // Update UI
        renderHand(player);
        renderCrystalZone(player);
        console.log(`Player ${player} Realm Counts:`, gameState.realmCounts[player]);
        
        // Add log entry
        const realmsText = card.realms.length > 1 
            ? `${card.realms.join("/")} (dual-realm)` 
            : card.realms[0];
        addLogEntry(`Player ${player} crystallized a ${realmsText} card`, player);
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
    const highlightColor = player === 1 ? "rgba(255, 0, 0, 0.2)" : "rgba(0, 0, 255, 0.2)";
    console.log(`Highlighting empty slots for player ${player} with color ${highlightColor}`);
    
    let foundEmptySlots = 0;
    
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            if (!gameState.board[row][col]) {
                foundEmptySlots++;
                const slot = document.getElementById(`slot-${row}-${col}`);
                if (!slot) {
                    console.error(`Could not find DOM element for slot-${row}-${col}`);
                    continue;
                }
                
                console.log(`Highlighting slot-${row}-${col} with color ${highlightColor}`);
                
                // More subtle highlighting
                slot.style.backgroundColor = highlightColor;
                slot.style.border = "2px solid yellow";
                slot.style.cursor = "pointer";
                
                // Remove any existing click listeners to prevent stacking
                if (slot._summonHandler) {
                    slot.removeEventListener("click", slot._summonHandler);
                }
                
                // Create a direct handler in global scope
                window[`summon_${row}_${col}`] = function() {
                    console.log(`Direct summon function called for slot-${row}-${col}`);
                    summonCard(player, cardIndex, row, col);
                };
                
                // Use direct onclick handler
                slot.onclick = window[`summon_${row}_${col}`];
                
                // Store for cleanup
                slot._summonHandler = window[`summon_${row}_${col}`];
            }
        }
    }
    
    console.log(`Highlighted ${foundEmptySlots} empty slots for summoning`);
}

// Clear highlights from the board
function clearHighlights() {
    console.log("Clearing highlights from the board");
    
    // Clear the global move tracking if it exists
    if (window.currentMoveCard) {
        console.log("Clearing global move tracking");
        window.currentMoveCard = null;
    }
    
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.getElementById(`slot-${row}-${col}`);
            if (!slot) {
                console.error(`Could not find DOM element for slot-${row}-${col}`);
                continue;
            }
            
            // Reset styles
            slot.style.backgroundColor = "";
            slot.style.border = "";
            slot.style.cursor = "";
            slot.style.boxShadow = "";
            
            // IMPORTANT: Remove any direct click handlers
            slot.onclick = null;
            
            // Remove data attributes
            slot.removeAttribute('data-destination-row');
            slot.removeAttribute('data-destination-col');
            slot.removeAttribute('data-is-move-target');
            
            // Clean up any remaining event listeners
            if (slot._summonHandler) {
                slot.removeEventListener("click", slot._summonHandler);
                slot._summonHandler = null;
            }
            
            if (slot._moveHandler) {
                slot.removeEventListener("click", slot._moveHandler);
                slot._moveHandler = null;
            }
            
            // Clean up global handlers
            if (window[`summon_${row}_${col}`]) {
                window[`summon_${row}_${col}`] = null;
            }
            
            if (window[`move_${row}_${col}`]) {
                window[`move_${row}_${col}`] = null;
            }
        }
    }
    
    // Remove any document-level handlers for move cancellation
    document.removeEventListener("click", cancelMoveHandler);
}

// Summon a card to the board
function summonCard(player, cardIndex, row, col) {
    const hand = gameState.hands[player];
    const card = hand[cardIndex];
    card.player = player;
    
    // Store the position directly on the card for later use
    card.boardRow = row;
    card.boardCol = col;
    
    gameState.board[row][col] = card;
    hand.splice(cardIndex, 1);
    renderHand(player);

    // Clear highlights before rendering the board
    clearHighlights();
    renderBoard();

    // Add log entry with chess notation
    const position = slotToChessNotation(`slot-${row}-${col}`);
    addLogEntry(`Player ${player} summoned a card to ${position}`, player);

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
        
        // Assign functions to global references
        globalRenderBoard = renderBoard;
        globalRenderCrystalZone = renderCrystalZone;
        globalCalculateLaneControl = calculateLaneControl;
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
        // No need to reset anything anymore since we removed the limits
    }

    // Initial setup
    setupGame();
    updateTurnIndicator(gameState.currentPlayer);

    // End Turn button functionality
    endTurnBtn.addEventListener("click", endTurn);

    // Add click events for the decks and set cardback image
    deckPlayer1.style.backgroundImage = "url('assets/cardback.png')";
    deckPlayer2.style.backgroundImage = "url('assets/cardback.png')";

    function endTurn() {
        console.log("Starting endTurn function");
        const currentPlayer = gameState.currentPlayer;
        const nextPlayer = currentPlayer === 1 ? 2 : 1;
        
        // Move logging here, before any game state changes
        addLogEntry(`Player ${currentPlayer}'s turn ended`, currentPlayer);
        addLogEntry(`Player ${nextPlayer}'s turn started`, nextPlayer);
        
        console.log(`Ending turn for Player ${currentPlayer}, starting turn for Player ${nextPlayer}`);
        
        // Clear any pending actions or menus first
        clearHighlights();
        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());
        
        // Update the game state
        gameState.currentPlayer = nextPlayer;
        
        // Always draw a card for the new current player
        console.log("Drawing cards for new current player:", nextPlayer);
        drawCards(nextPlayer, 1);
        
        // Update the UI
        updateTurnIndicator(nextPlayer);
        updateDeckCounts();
        
        // Re-render hands for both players
        console.log("Re-rendering hands for both players");
        renderHand(1);
        renderHand(2);
        
        // Recalculate lane control and check win condition
        console.log("Calculating lane control and checking win condition");
        calculateLaneControl();
        if (checkWinCondition()) {
            console.log("Win condition met, disabling actions");
            endTurnBtn.disabled = true;
            document.querySelectorAll(".deck").forEach(deck => deck.style.pointerEvents = "none");
        }
    
        console.log("Finished endTurn function");
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

    // Show context menu for cards in the Crystal Zone or on the board
    function showCardInPlayMenu(player, card, cardElement, location, index) {
        console.log("showCardInPlayMenu called with:", { 
            player, 
            card: card.name, 
            location, 
            index,
            isCurrentPlayer: player === gameState.currentPlayer
        });
        
        if (player !== gameState.currentPlayer) {
            console.log("Not the current player's turn, ignoring menu request");
            return; // Silently ignore if it's not the player's turn
        }

        // Remove any existing menus first
        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());

        const menu = document.createElement("div");
        menu.classList.add("action-menu");

        const rect = cardElement.getBoundingClientRect();
        menu.style.left = `${rect.right + 5}px`;
        menu.style.top = `${rect.top}px`;

        // Return to Hand
        const returnToHandBtn = document.createElement("button");
        returnToHandBtn.textContent = "Return to Hand";
        returnToHandBtn.addEventListener("click", () => {
            console.log("Return to Hand clicked for:", card.name, "at", index);
            menu.remove(); // Remove menu first
            returnToHand(player, card, location, index);
        });
        menu.appendChild(returnToHandBtn);

        // Move Card (only for cards on the board)
        if (location === "board") {
            const moveCardBtn = document.createElement("button");
            moveCardBtn.textContent = "Move Card";
            moveCardBtn.addEventListener("click", () => {
                console.log("Move Card clicked for:", card.name, "at", index);
                menu.remove(); // Remove menu first
                startMoveCard(player, card, index);
            });
            menu.appendChild(moveCardBtn);
            
            // Crystallize (only for cards on the board)
            const crystallizeBtn = document.createElement("button");
            crystallizeBtn.textContent = "Crystallize";
            crystallizeBtn.addEventListener("click", () => {
                console.log("Crystallize clicked for:", card.name, "at", index);
                menu.remove(); // Remove menu first
                crystallizeCardFromBoard(player, card, index);
            });
            menu.appendChild(crystallizeBtn);
        }

        // Bury/Unearth Option (for both crystal zone and board)
        if (card.isBuried) {
            const unearthBtn = document.createElement("button");
            unearthBtn.textContent = "Unearth";
            unearthBtn.addEventListener("click", () => {
                console.log("Unearth clicked for:", card.name, "at", index);
                menu.remove(); // Remove menu first
                unearthCard(player, card, location, index);
            });
            menu.appendChild(unearthBtn);
        } else {
            const buryBtn = document.createElement("button");
            buryBtn.textContent = "Bury";
            buryBtn.addEventListener("click", () => {
                console.log("Bury clicked for:", card.name, "at", index);
                menu.remove(); // Remove menu first
                buryCard(player, card, location, index);
            });
            menu.appendChild(buryBtn);
        }

        // Move to Top of Deck
        const moveToTopBtn = document.createElement("button");
        moveToTopBtn.textContent = "Move to Top of Deck";
        moveToTopBtn.addEventListener("click", () => {
            console.log("Move to Top clicked for:", card.name, "at", index);
            menu.remove(); // Remove menu first
            moveToDeck(player, card, location, index, "top");
        });
        menu.appendChild(moveToTopBtn);

        // Move to Bottom of Deck
        const moveToBottomBtn = document.createElement("button");
        moveToBottomBtn.textContent = "Move to Bottom of Deck";
        moveToBottomBtn.addEventListener("click", () => {
            console.log("Move to Bottom clicked for:", card.name, "at", index);
            menu.remove(); // Remove menu first
            moveToDeck(player, card, location, index, "bottom");
        });
        menu.appendChild(moveToBottomBtn);

        document.body.appendChild(menu);
        menu.style.display = "block";
        console.log("Action menu displayed for:", card.name);

        // Add a click handler to the document that will be removed when the menu is closed
        function closeMenuHandler(event) {
            if (!menu.contains(event.target) && event.target !== cardElement) {
                menu.remove();
                document.removeEventListener("click", closeMenuHandler);
                console.log("Action menu closed");
            }
        }

        // Add the event listener with a slight delay to prevent immediate triggering
        setTimeout(() => {
            document.addEventListener("click", closeMenuHandler);
        }, 0);
    }

    // Add new function to crystallize a card from the board
    function crystallizeCardFromBoard(player, card, slotId) {
        // Remove all action menus first
        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());

        const [_, row, col] = slotId.split('-');
        const position = slotToChessNotation(slotId);
        gameState.board[parseInt(row)][parseInt(col)] = null;
        
        let cardToCrystallize = {...card}; // Create a copy of the card
        gameState.crystalZones[player].push(cardToCrystallize);

        cardToCrystallize.realms.forEach(realm => {
            gameState.realmCounts[player][realm]++;
        });

        renderBoard();
        renderCrystalZone(player);
        calculateLaneControl();
        addLogEntry(`Player ${player} moved a card from ${position} to Crystal Zone`, player);
    }

    // Return a card to the player's hand
    function returnToHand(player, card, location, index) {
        console.log("returnToHand called with:", { player, card: card.name, location, index });
        
        // Remove any existing menus first
        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());

        let cardToReturn = JSON.parse(JSON.stringify(card)); // Deep copy
        cardToReturn.player = player;
        
        console.log("Card to return:", cardToReturn);

        if (location === "crystalZone") {
            console.log("Returning from crystal zone at index:", index);
            gameState.crystalZones[player].splice(index, 1);
            cardToReturn.realms.forEach(realm => {
                gameState.realmCounts[player][realm]--;
            });
            renderCrystalZone(player);
            gameState.hands[player].push(cardToReturn);
            renderHand(player);
            
            // Log the action
            const logMessage = `Player ${player} returned a card from Crystal Zone to hand`;
            console.log("Adding log entry:", logMessage);
            addLogEntry(logMessage, player);
            
        } else if (location === "board") {
            console.log("Returning from board at position:", index);
            
            try {
                // Parse board position
                const parts = index.split('-');
                console.log("Split parts:", parts);
                
                if (parts.length !== 3) {
                    console.error("Invalid board position format:", index);
                    return;
                }
                
                const row = parseInt(parts[1]);
                const col = parseInt(parts[2]);
                
                console.log("Parsed position:", { row, col });
                
                // Get chess notation before we remove the card
                const position = slotToChessNotation(index);
                console.log("Board position in chess notation:", position);
                
                // Verify the card is at this position
                const cardAtPosition = gameState.board[row][col];
                console.log("Card at position:", cardAtPosition);
                
                if (!cardAtPosition) {
                    console.error("No card found at position:", index);
                    return;
                }
                
                // Remove from board
                gameState.board[row][col] = null;
                console.log("Removed card from board position");
                
                // Add to hand
                gameState.hands[player].push(cardToReturn);
                console.log("Added card to hand, new hand size:", gameState.hands[player].length);
                
                // Update UI
                renderBoard();
                renderHand(player);
                calculateLaneControl();
                
                // Log the action
                const logMessage = `Player ${player} returned a card from ${position} to hand`;
                console.log("Adding log entry:", logMessage);
                addLogEntry(logMessage, player);
                
            } catch (error) {
                console.error("Error in returnToHand for board card:", error);
            }
        }
    }

    // Move a card to the player's deck (top or bottom)
    function moveToDeck(player, card, location, index, deckPosition) {
        console.log("moveToDeck called with:", { player, card: card.name, location, index, deckPosition });
        
        // Remove any existing menus first
        document.querySelectorAll(".action-menu").forEach(menu => menu.remove());

        // Create a deep copy of the card with all properties
        let cardToMove = JSON.parse(JSON.stringify(card));
        cardToMove.player = player;
        
        console.log("Card to move:", cardToMove);

        if (location === "crystalZone") {
            console.log("Moving from crystal zone at index:", index);
            // Remove from crystal zone
            gameState.crystalZones[player].splice(index, 1);
            cardToMove.realms.forEach(realm => {
                gameState.realmCounts[player][realm]--;
            });
            renderCrystalZone(player);
            
            // Add to deck
            if (deckPosition === "top") {
                gameState.decks[player].unshift(cardToMove);
            } else {
                gameState.decks[player].push(cardToMove);
            }
            updateDeckCounts();
            
            // Log the action
            const logMessage = `Player ${player} moved a card from Crystal Zone to the ${deckPosition} of their deck`;
            console.log("Adding log entry:", logMessage);
            addLogEntry(logMessage, player);
            
        } else if (location === "board") {
            console.log("Moving from board at position:", index);
            
            try {
                // Parse board position
                const parts = index.split('-');
                console.log("Split parts:", parts);
                
                if (parts.length !== 3) {
                    console.error("Invalid board position format:", index);
                    return;
                }
                
                const row = parseInt(parts[1]);
                const col = parseInt(parts[2]);
                
                console.log("Parsed position:", { row, col });
                
                // Get chess notation before we remove the card
                const boardPosition = slotToChessNotation(index);
                console.log("Board position in chess notation:", boardPosition);
                
                // Verify the card is at this position
                const cardAtPosition = gameState.board[row][col];
                console.log("Card at position:", cardAtPosition);
                
                if (!cardAtPosition) {
                    console.error("No card found at position:", index);
                    return;
                }
                
                // Remove from board
                gameState.board[row][col] = null;
                console.log("Removed card from board position");
                
                // Add to deck
                if (deckPosition === "top") {
                    console.log("Adding to top of deck");
                    gameState.decks[player].unshift(cardToMove);
                } else {
                    console.log("Adding to bottom of deck");
                    gameState.decks[player].push(cardToMove);
                }
                
                // Update UI
                renderBoard();
                updateDeckCounts();
                calculateLaneControl();
                
                // Log the action
                const logMessage = `Player ${player} moved a card from ${boardPosition} to the ${deckPosition} of their deck`;
                console.log("Adding log entry:", logMessage);
                addLogEntry(logMessage, player);
                
            } catch (error) {
                console.error("Error in moveToDeck for board card:", error);
            }
        }

        // Debug log
        console.log(`Deck after move (${player}):`, gameState.decks[player].map(c => c.name));
    }

    // Function to bury a card (flip face-down)
    function buryCard(player, card, location, index) {
        if (location === "crystalZone") {
            // Get the card from the crystal zone
            const crystalCard = gameState.crystalZones[player][index];
            
            if (!crystalCard) {
                console.error("Card not found in crystal zone:", index);
                return;
            }
            
            // Before burying, remove the current realm counts
            crystalCard.realms.forEach(realm => {
                gameState.realmCounts[player][realm]--;
            });
            
            // Save original realms if not already saved
            if (!crystalCard.originalRealms) {
                crystalCard.originalRealms = [...crystalCard.realms];
            }
            
            // Set to buried state
            crystalCard.isBuried = true;
            crystalCard.realms = ["Colorless"]; // Buried crystals are considered Colorless
            
            // Add to colorless count
            gameState.realmCounts[player].Colorless++;
            
            // Update UI
            renderCrystalZone(player);
            
            // Log the action
            addLogEntry(`Player ${player} buried a crystal card (${card.name})`, player);
        } 
        else if (location === "board") {
            // Parse board position
            const parts = index.split('-');
            if (parts.length !== 3) {
                console.error("Invalid board position format:", index);
                return;
            }
            
            const row = parseInt(parts[1]);
            const col = parseInt(parts[2]);
            
            // Get chess notation before modification
            const position = slotToChessNotation(index);
            
            // Get the card from the board
            const boardCard = gameState.board[row][col];
            
            if (!boardCard) {
                console.error("Card not found on board:", index);
                return;
            }
            
            // Store original power if not already stored
            if (boardCard.originalPower === undefined) {
                boardCard.originalPower = boardCard.power;
            }
            
            // Set to buried state
            boardCard.isBuried = true;
            boardCard.power = 0; // Buried cards on board have 0 power
            
            // Update UI
            renderBoard();
            
            // Recalculate lane control after burying
            calculateLaneControl();
            
            // Log the action
            addLogEntry(`Player ${player} buried a card at ${position} (${card.name})`, player);
        }
    }
    
    // Function to unearth a card (flip face-up)
    function unearthCard(player, card, location, index) {
        if (location === "crystalZone") {
            // Get the card from the crystal zone
            const crystalCard = gameState.crystalZones[player][index];
            
            if (!crystalCard) {
                console.error("Card not found in crystal zone:", index);
                return;
            }
            
            // Remove colorless count
            gameState.realmCounts[player].Colorless--;
            
            // Restore original realms
            if (crystalCard.originalRealms) {
                crystalCard.realms = [...crystalCard.originalRealms];
                
                // Add back original realm counts
                crystalCard.realms.forEach(realm => {
                    gameState.realmCounts[player][realm]++;
                });
            }
            
            // Set to unearthed state
            crystalCard.isBuried = false;
            
            // Update UI
            renderCrystalZone(player);
            
            // Log the action
            addLogEntry(`Player ${player} unearthed a crystal card (${card.name})`, player);
        } 
        else if (location === "board") {
            // Parse board position
            const parts = index.split('-');
            if (parts.length !== 3) {
                console.error("Invalid board position format:", index);
                return;
            }
            
            const row = parseInt(parts[1]);
            const col = parseInt(parts[2]);
            
            // Get chess notation before modification
            const position = slotToChessNotation(index);
            
            // Get the card from the board
            const boardCard = gameState.board[row][col];
            
            if (!boardCard) {
                console.error("Card not found on board:", index);
                return;
            }
            
            // Restore original power
            if (boardCard.originalPower !== undefined) {
                boardCard.power = boardCard.originalPower;
            }
            
            // Set to unearthed state
            boardCard.isBuried = false;
            
            // Update UI
            renderBoard();
            
            // Recalculate lane control after unearthing
            calculateLaneControl();
            
            // Log the action
            addLogEntry(`Player ${player} unearthed a card at ${position} (${card.name})`, player);
        }
    }

    // Function to start moving a card on the board
    function startMoveCard(player, card, slotId) {
        console.log("Starting to move card:", card.name, "from", slotId);
        
        // Use the position stored directly on the card (more reliable)
        if (card.boardRow !== undefined && card.boardCol !== undefined) {
            const currentRow = card.boardRow;
            const currentCol = card.boardCol;
            
            console.log(`Using stored position: row=${currentRow}, col=${currentCol}`);
            console.log(`Card at position:`, gameState.board[currentRow][currentCol]);
            
            // Verify the card exists at this position
            if (!gameState.board[currentRow][currentCol]) {
                console.error("No card found at stored position:", `slot-${currentRow}-${currentCol}`);
                return;
            }
            
            // Clear any existing highlights
            clearHighlights();
            
            // Set a global variable to track the card being moved
            window.currentMoveCard = {
                sourceRow: currentRow,
                sourceCol: currentCol,
                player: player
            };
            
            console.log("Set global move tracking:", window.currentMoveCard);
            
            // Highlight empty slots on the board
            const highlightColor = player === 1 ? "rgba(255, 0, 0, 0.2)" : "rgba(0, 0, 255, 0.2)";
            console.log(`Highlighting empty slots for player ${player} with color ${highlightColor}`);
            
            let foundEmptySlots = 0;
            
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 5; col++) {
                    // Skip the current position
                    if (row === currentRow && col === currentCol) {
                        continue;
                    }
                    
                    // Only highlight empty slots
                    if (!gameState.board[row][col]) {
                        foundEmptySlots++;
                        const slot = document.getElementById(`slot-${row}-${col}`);
                        if (!slot) {
                            console.error(`Could not find DOM element for slot-${row}-${col}`);
                            continue;
                        }
                        
                        console.log(`Highlighting slot-${row}-${col} with color ${highlightColor}`);
                        
                        // More subtle highlighting
                        slot.style.backgroundColor = highlightColor;
                        slot.style.border = "2px solid yellow";
                        slot.style.cursor = "pointer";
                        
                        // Set destination attributes directly on the element
                        slot.setAttribute('data-destination-row', row);
                        slot.setAttribute('data-destination-col', col);
                        slot.setAttribute('data-is-move-target', 'true');
                        
                        // Simpler direct click handler
                        slot.onclick = handleMoveClick;
                    }
                }
            }
            
            console.log(`Highlighted ${foundEmptySlots} empty slots on the board`);
            
            if (foundEmptySlots === 0) {
                console.warn("No empty slots found to highlight! The board might be full.");
                return;
            }
            
            // Allow clicking anywhere else to cancel the move
            document.addEventListener("click", cancelMoveHandler);
        } else {
            console.error("Card position information not available");
        }
    }

    // Global handler for slot clicks during move
    function handleMoveClick(event) {
        // Stop event propagation immediately
        event.stopPropagation();
        event.preventDefault();
        
        console.log("Slot clicked for move");
        
        // Check if we have a valid move in progress
        if (!window.currentMoveCard) {
            console.error("No card currently being moved!");
            clearHighlights(); // Clean up any lingering highlights
            return;
        }
        
        // Get the slot that was clicked
        const targetSlot = event.currentTarget;
        
        // Sanity check - make sure this is actually a slot
        if (!targetSlot || !targetSlot.id || !targetSlot.id.startsWith('slot-')) {
            console.error("Invalid target element:", targetSlot);
            return;
        }
        
        // Get the destination coordinates
        const destRow = parseInt(targetSlot.getAttribute('data-destination-row'));
        const destCol = parseInt(targetSlot.getAttribute('data-destination-col'));
        
        console.log(`Move target clicked: destination (${destRow},${destCol})`);
        
        if (isNaN(destRow) || isNaN(destCol)) {
            console.error("Invalid destination attributes on target element");
            return;
        }
        
        // Verify the source still has a card and destination is empty
        const sourceRow = window.currentMoveCard.sourceRow;
        const sourceCol = window.currentMoveCard.sourceCol;
        const player = window.currentMoveCard.player;
        
        if (!gameState.board[sourceRow][sourceCol]) {
            console.error("Source position no longer has a card");
            clearHighlights();
            return;
        }
        
        if (gameState.board[destRow][destCol]) {
            console.error("Destination position is already occupied");
            clearHighlights();
            return;
        }
        
        console.log(`Executing move from (${sourceRow},${sourceCol}) to (${destRow},${destCol}) for player ${player}`);
        
        // Execute the move
        moveCardToSlot(player, sourceRow, sourceCol, destRow, destCol);
        
        // Clean up
        clearHighlights();
    }

    // Handler for cancelling moves
    function cancelMoveHandler(event) {
        // Get the clicked element
        const target = event.target;
        
        // If the click is on a move target, don't cancel
        if (target && target.getAttribute && target.getAttribute('data-is-move-target') === 'true') {
            console.log("Click on valid move target, not canceling");
            return;
        }
        
        // If we're clicking on an action menu or a card, don't cancel
        if (target && (
            (target.classList && target.classList.contains('action-menu')) ||
            (target.parentElement && target.parentElement.classList && target.parentElement.classList.contains('action-menu')) ||
            (target.classList && target.classList.contains('card'))
        )) {
            console.log("Click on menu or card, not canceling");
            return;
        }
        
        console.log("Clicked outside highlighted area, canceling move");
        clearHighlights(); // This will also remove the event listener and clear the tracking
    }

}); // Close the DOMContentLoaded event listener

// Calculate lane control
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
            
            // Skip power calculation for buried cards - they contribute 0 power
            if (card.isBuried) {
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
            
            // Skip power calculation for buried cards - they contribute 0 power
            if (card.isBuried) {
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

// Check win condition
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
        
        // Debug - print stacktrace to see where this is being called from
        console.log("Log entry call stack:", new Error().stack);
        
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
        console.log("Log entry added successfully:", fullMessage); // Debug log
    } else {
        console.error("Log container not found!");
    }
}

// Helper function to convert slot ID to chess notation
function slotToChessNotation(slotId) {
    console.log("Converting to chess notation:", slotId); // Debug log
    
    // Handle if slotId is already parsed
    if (typeof slotId === 'string') {
        // Convert "slot-0-0" format to "a1" format
        const parts = slotId.split('-');
        if (parts.length === 3) {
            const row = parseInt(parts[1]);
            const col = parseInt(parts[2]);
            const columns = ['a', 'b', 'c', 'd', 'e'];
            const rows = ['4', '3', '2', '1']; // Reversed order since our grid starts from top
            
            const notation = columns[col] + rows[row];
            console.log("Converted to chess notation:", notation); // Debug log
            return notation;
        }
    }
    
    console.error("Invalid slotId format:", slotId);
    return "unknown";
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

// Test function to highlight all empty slots (for debug purposes)
function testHighlightEmptySlots() {
    const highlightColor = "rgba(0, 255, 255, 0.5)"; // Cyan color for testing
    console.log("DEBUG: Highlighting all empty slots for testing");
    
    let count = 0;
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            if (!gameState.board[row][col]) {
                count++;
                const slot = document.getElementById(`slot-${row}-${col}`);
                if (!slot) {
                    console.error(`Could not find DOM element for slot-${row}-${col}`);
                    continue;
                }
                
                // Force stronger styling to ensure visibility
                slot.style.backgroundColor = highlightColor;
                slot.style.border = "3px solid yellow";
                slot.style.cursor = "pointer";
                slot.style.boxShadow = "0 0 10px yellow";
            }
        }
    }
    
    console.log(`DEBUG: Highlighted ${count} empty slots`);
    
    // Auto-clear highlights after 3 seconds
    setTimeout(() => {
        clearHighlights();
        console.log("DEBUG: Auto-cleared highlights");
    }, 3000);
}

// Debug function to test slot click detection
function testSlotClicks() {
    console.log("Setting up click test on all slots");
    
    // First clean up any existing handlers
    clearHighlights();
    
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            const slot = document.getElementById(`slot-${row}-${col}`);
            if (!slot) {
                console.error(`Could not find DOM element for slot-${row}-${col}`);
                continue;
            }
            
            // Make the slot visibly clickable
            slot.style.backgroundColor = "rgba(0, 255, 0, 0.2)";
            slot.style.border = "1px solid green";
            slot.style.cursor = "pointer";
            
            // Direct click handler
            slot.onclick = function() {
                console.log(`TEST CLICK DETECTED on slot-${row}-${col}`);
                alert(`Clicked on slot-${row}-${col}`);
            };
        }
    }
    
    console.log("Test slots set up - click any slot to test");
    
    // Auto-clear after 10 seconds
    setTimeout(function() {
        console.log("Clearing test slot handlers");
        clearHighlights();
    }, 10000);
}

// Function to move a card from one slot to another
function moveCardToSlot(player, fromRow, fromCol, toRow, toCol) {
    console.log(`Moving card from (${fromRow},${fromCol}) to (${toRow},${toCol})`);
    
    // Get the card that's being moved
    const card = gameState.board[fromRow][fromCol];
    if (!card) {
        console.error("No card found at source position");
        return;
    }
    
    // Make sure the destination is empty
    if (gameState.board[toRow][toCol]) {
        console.error("Destination slot is not empty!");
        return;
    }
    
    // Update the stored position on the card object
    card.boardRow = toRow;
    card.boardCol = toCol;
    
    // Move the card in the game state
    gameState.board[toRow][toCol] = card;
    gameState.board[fromRow][fromCol] = null;
    
    // Get chess notation for positions
    const fromPosition = slotToChessNotation(`slot-${fromRow}-${fromCol}`);
    const toPosition = slotToChessNotation(`slot-${toRow}-${toCol}`);
    
    // Update the UI
    if (typeof globalRenderBoard === 'function') {
        globalRenderBoard();
    } else {
        renderBoard();
    }
    
    // Recalculate lane control
    if (typeof globalCalculateLaneControl === 'function') {
        globalCalculateLaneControl();
    } else {
        calculateLaneControl();
    }
    
    // Log the action
    addLogEntry(`Player ${player} moved a card from ${fromPosition} to ${toPosition}`, player);
    
    console.log(`Successfully moved card from ${fromPosition} to ${toPosition}`);
}