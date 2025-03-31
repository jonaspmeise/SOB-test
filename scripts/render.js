import { components } from './state.js';
import { getCardArtUrl, showCardPreview, getRawCardArtUrl } from './utility.js';
import { handleInteraction } from './interaction-handler.js';

// Private Utility functions.
const gameBoardElement = document.getElementById('game-board');
const createCardElement = (card, rawArt = false) => {
    let element = document.createElement('div');
    element.id = card.id;
    element.classList.add('card', `player${components.get(card.owner$).index + 1}`);
    if(card !== undefined && card.Realms !== undefined) {
        element.classList.add(`realm-${card.Realms.trim().split(/\s/).join('-').toLowerCase()}`);
    }
    element.style.backgroundImage = rawArt
        ? getRawCardArtUrl(card)
        : getCardArtUrl(card);

    element.addEventListener('mouseover', () => showCardPreview(card));
    element.addEventListener('click', e => {
        handleInteraction(card.id);
        e.stopPropagation();
    });

    return element;
};
const removeDanglingNodes = (parent, nodeFilterFunction, name) => {
    [
        ...parent
        .childNodes
        .values()
    ]
    .filter(node => nodeFilterFunction(+node.id))
    .forEach(node => {
        console.debug(`Removing node ${node.id} from ${name} #${parent.id} because it no longer exists there!`);
        node.remove();
    });
}

// Main function.
// TODO: Only render a diff model here (subset of model with changed properties.)
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
            const card = components.get(cardId);

            if(cardElement == null) {
                slotElement.appendChild(createCardElement(card));
            }
            removeDanglingNodes(slotElement, (node) => cardId != node, 'Slot');
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
        powerIndicator.innerHTML = `<span class="${powerDisparity == 0 ? 'neutral' : powerDisparity > 0 ? `player1` : 'player2'}">${Math.abs(powerDisparity)}</span>`;

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
            const card = components.get(cardId);            
            let cardElement = crystalzoneElement.querySelector(`[id="${cardId}"]`);

            if(cardElement == null) {
                crystalzoneElement.appendChild(createCardElement(card, true));
            }
        });

        // Clean up dangling DOM nodes of cards that are no longer in this zone.
        
        removeDanglingNodes(crystalzoneElement, (nodeId) => !player.crystalzone$.includes(nodeId), 'Crystal Zone');
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
        removeDanglingNodes(handElement, (nodeId) => !player.hand$.includes(nodeId), 'Hand');

        player.hand$.forEach(cardId => {
            const card = components.get(cardId);
            let cardElement = document.getElementById(cardId);
            
            if(cardElement == null) {
                handElement.appendChild(createCardElement(card));
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

    // Render Stats.
    const gameStatElement = document.getElementById('game-stats');

    const turnId = model.turn.id;
    let endTurnElement = document.getElementById(turnId);
    if(endTurnElement == null) {
        endTurnElement = document.createElement('button');
        endTurnElement.id = turnId;
        endTurnElement.type = 'button';
        endTurnElement.textContent = 'Pass Turn';
        endTurnElement.classList.add('end-turn-button');

        endTurnElement.addEventListener('click', e => {
            handleInteraction(turnId);
            e.stopPropagation();
        });
        
        gameStatElement.appendChild(endTurnElement);
    }

    model.players.forEach((player, i) => {
        const statElementId = `player${i + 1}-stats`;
        let statElement = document.getElementById(statElementId);

        if(statElement == null) {
            statElement = document.createElement('div');
            statElement.id = statElementId;
            statElement.classList.add(`player${i + 1}`);
            
            gameStatElement.appendChild(statElement);
        }

        statElement.textContent = `Won Lanes: ${player.wonLanes}`;
    });
};