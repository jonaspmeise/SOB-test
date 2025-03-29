import { componentMap } from './model.js';
import { getCardArtUrl, showCardPreview, getRawCardArtUrl } from './utility.js';
import { handleInteraction } from './interaction-handler.js';

const gameBoardElement = document.getElementById('game-board');
export const render = (model) => {
    // Slots on Board.
    model.board.slots.forEach(slot => {
        let slotElement = document.getElementById(slot.id);

        if(slotElement == null) {
            slotElement = document.createElement('div');
            slotElement.classList.add('slot');
            slotElement.id = slot.id;

            slotElement.addEventListener('click', e => {
                handleInteraction(slot.id);
                e.stopPropagation();
            });
    
            gameBoardElement.appendChild(slotElement);
        }

        // Cards in Slots.
        const cardId = slot.card$
        if(cardId !== undefined) {
            let cardElement = slotElement.querySelector(`[id="${cardId}"]`);
            const card = componentMap.get(cardId);

            if(cardElement == null) {
                const imageUrl = getCardArtUrl(card);

                cardElement = document.createElement('div');
                cardElement.id = cardId;
                cardElement.classList.add('card');
                if(card !== undefined && card.Realms !== undefined) {
                    cardElement.classList.add(`realm-${card.Realms.trim().split(/\s/).join('-').toLowerCase()}`);
                }
                cardElement.style.backgroundImage = imageUrl;
                
                cardElement.addEventListener('mouseover', () => showCardPreview(card));
                cardElement.addEventListener('click', e => {
                    handleInteraction(cardId);
                    e.stopPropagation();
                });

                slotElement.appendChild(cardElement);
            }

            // Remove no longer referenced nodes in the DOM, if the model doesn't reference the card anymore.
            [
                ...slotElement
                .childNodes
                .values()
            ]
            .filter(node => cardId != +node.id)
            .forEach(node => {
                console.debug(`Removing node ${node.id} from Slot #${slot.id} because the referenced Card no longer exists there!`);
                node.remove();
            });
        }
    });
    
    // Deck.
    model.players.forEach((player, i) => {
        const deckId = player.deck$.id;
        // TODO: Only render when element doesn't yet exist.
        if(document.getElementById(deckId) != null) {
            return;
        }

        const deckElement = document.createElement('div');
        deckElement.id = deckId;

        deckElement.addEventListener('click', e => {
            handleInteraction(deckId);
            e.stopPropagation();
        });
    });

    // Lanes.
    model.board.lanes.forEach((lane, i) => {
        // Render single Lane.
        let laneElement = document.getElementById(lane.id);
        if(laneElement == null) {
            const cssClass = `lane lane-${i} lane-${lane.orientation}`;

            laneElement = document.createElement('div');
            laneElement.classList.add(...cssClass.split(' '));
            laneElement.id = lane.id;
            laneElement.addEventListener('click', e => {
                handleInteraction(lane.id);
                e.stopPropagation();
            });
        }

        // Render Power indicator for this lane.
        const powerIndicatorId = `power-indicator-${i}`;

        let powerIndicator = document.getElementById(powerIndicatorId);
        if(powerIndicator == null) {
            powerIndicator = document.createElement('div');
            
            powerIndicator.classList.add('power-indicator');
            powerIndicator.id = powerIndicatorId;
            laneElement.appendChild(powerIndicator);

            gameBoardElement.appendChild(laneElement);
        }
        // Always update Power per Player per Lane!
        const powerPlayerEntries = lane.$properties().$power();
        const powerDisparity = powerPlayerEntries[0].power - powerPlayerEntries[1].power;
        powerIndicator.innerHTML = `<span class="${powerDisparity == 0 ? 'neutral' : powerDisparity > 0 ? `player1` : 'player2'}">${powerDisparity}</span>`;

    });

    // Crystal Zones.
    model.players.forEach((player, i) => {
        // Render Crystal Zones
        const crystalzoneId = player.crystalzone$.id;

        let crystalzoneElement = document.getElementById(crystalzoneId);
        if(crystalzoneElement == null) {
            crystalzoneElement = document.createElement('div');
            crystalzoneElement.id = crystalzoneId;
            crystalzoneElement.classList.add('crystalzone', `player${i + 1}-crystalzone`);

            crystalzoneElement.addEventListener('click', e => {
                handleInteraction(crystalzoneId);
                e.stopPropagation();
            });
            
            const playerArea = document.getElementById(`player${i + 1}-area`);
            playerArea.appendChild(crystalzoneElement);
        }

        // Render cards in crystal zone.
        player.crystalzone$.forEach(cardId => {
            const card = componentMap.get(cardId);            
            let cardElement = crystalzoneElement.querySelector(`[id="${cardId}"]`);

            if(cardElement == null) {
                cardElement = document.createElement('div');
                cardElement.id = cardId;
                cardElement.classList.add('card');
                if(card !== undefined && card.Realms !== undefined) {
                    cardElement.classList.add(`realm-${card.Realms.trim().split(/\s/).join('-').toLowerCase()}`);
                }
                cardElement.style.backgroundImage = getRawCardArtUrl(card);

                cardElement.addEventListener('mouseover', () => showCardPreview(card));
                cardElement.addEventListener('click', e => {
                    handleInteraction(cardId);
                    e.stopPropagation();
                });
                
                crystalzoneElement.appendChild(cardElement);
            }
        });

        // Clean up dangling DOM nodes of cards that are no longer in this zone.
        [
            ...crystalzoneElement
            .childNodes
            .values()
        ]
        .filter(node => !player.crystalzone$.includes(+node.id))
        .forEach(node => {
            console.debug(`Removing node ${node.id} from Crystal Zone #${crystalzoneElement.id} because the referenced Card no longer exists there!`);
            node.remove();
        });
    });

    // Hand.
    model.players.forEach((player, i) => {
        const handId = player.hand$.id;

        if(document.getElementById(handId) != null) {
            return;
        }

        const handElement = document.createElement('div');
        handElement.id = handId;
        handElement.classList.add('hand', `player${i + 1}-hand`);

        const playerArea = document.getElementById(`player${i + 1}-area`);
        playerArea.appendChild(handElement);
    });
    
    // Cards in Hand.
    model.players.forEach(player => {
        const handElement = document.getElementById(player.hand$.id);

        // Remove no longer referenced nodes in the DOM, if the model doesn't hold the card anymore.
        [
            ...document.getElementById(player.hand$.id)
            .childNodes
            .values()
        ]
        .filter(node => !player.hand$.includes(+node.id))
        .forEach(node => {
            console.debug(`Removing node ${node.id} from Hand #${handElement.id} because the referenced Card no longer exists there!`);
            node.remove();
        });

        player.hand$.forEach(cardId => {
            const card = componentMap.get(cardId);
            let cardElement = document.getElementById(cardId);
            
            if(cardElement == null) {
                cardElement = document.createElement('div');
                cardElement.classList.add('card');
                if(card !== undefined && card.Realms !== undefined) {
                    cardElement.classList.add(`realm-${card.Realms.trim().split(/\s/).join('-').toLowerCase()}`);
                }

                cardElement.id = cardId;
                cardElement.style.backgroundImage = getCardArtUrl(card);

                cardElement.addEventListener('mouseover', () => showCardPreview(card));
                cardElement.addEventListener('click', e => {
                    handleInteraction(cardId);
                    e.stopPropagation();
                });
                
                handElement.appendChild(cardElement);
            }
        });
    });

    // Deck.
    model.players.forEach((player, i) => {       
        const deckArea = document.getElementById(`deck-area-player${i + 1}`)

        const deckId = player.deck$.id;
        if(document.getElementById(deckId) == null) {
            const deckElement = document.createElement('div');
            deckElement.classList.add('deck');
            deckElement.id = deckId;
            deckElement.addEventListener('click', e => {
                handleInteraction(deckId);
                e.stopPropagation();
            });

            deckArea.appendChild(deckElement);
        }

        // Deck Count - render once, update always.
        const deckCounterId = `counter-player${i + 1}`;
        let deckCounterElement = document.getElementById(deckCounterId);
        if(deckCounterElement == null) {
            deckCounterElement = document.createElement('div');
            deckCounterElement.classList.add('deck-count');
            deckCounterElement.id = deckCounterId;

            deckArea.appendChild(deckCounterElement);
        }
        // Always update this value!
        deckCounterElement.textContent = player.deck$.length;
    });
};