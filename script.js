// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

// CONSTANTS
const cardFile = './cards.json';
const resolveCardArt = (name) => `https://cdn.shardsofbeyond.com/rashid-test/${name.toLowerCase().replaceAll(/\W/g, '')}.png`;

// HELPER FUNCTIONS
const componentMap = new Map();

let counter = 0;
const identify = (obj, types) => {
    console.debug(`Registering component of types "${types}" with ID ${counter}...`);
    obj.id = counter;
    obj.types = types;
    componentMap.set(counter, obj);

    counter++;
    
    return obj;
};

const createPlayerDefaultSettings = (name) => {
    return identify({
        name: name,
        deck: identify([], ['deck']),
        hand: identify([], ['hand']),
        crystalZone: identify({
            cards: [],
            realmCounts: {
                Divine: 0,
                Elemental: 0,
                Mortal: 0,
                Nature: 0,
                Void: 0
            },
            total: 0
        }, ['crystalzone'])
    }, ['player']);
};

// Create a new log entry.
const log = (text, fancy = false) => {
    const log = document.getElementById('log');

    const entry = document.createElement('div');
    entry.classList.add('log-entry');
    if(fancy) {
        entry.classList.add('log-entry-fancy');
    }
    entry.innerHTML = text;

    log.firstElementChild.insertAdjacentHTML("beforebegin", entry.outerHTML);
};

// Do an entire tick of the game state - update the view, actions, ...
const tick = () => {
    console.log('...tack');
    render(state);
};

const preview = document.getElementById('card-preview');

const showCardPreview = (imageUrl) => {
    preview.style.backgroundImage = imageUrl;
    preview.style.display = 'block';
};

const hideCardPreview = () => {
    preview.style.display = 'none';
};

const handleInteraction = (id) => {
    const component = componentMap.get(id);
    log(`${state.currentPlayer.name} interacted with ${component.types} #${id}`, true);
};

const initializeLane = ($slots) => (() => {
    const lane = {
        orientation: 'horizontal',
        $slots: $slots,
        $power: state.players.map(player => {
            return {
                player$: player.id,
                power: $slots()
                    .map(slot => slot.card)
                    .filter(card => card !== undefined)
                    .filter(card => card.owner == player)
                    .reduce((prev, curr) => prev + curr.Power, 0)
            };
        })
    };

    return lane;
});

// TODO: Make either idempotent or only render diff!
const render = (model) => {
    // Cards on Board.
    model.board.slots.forEach(slot => {
        // TODO: Only render when element doesn't yet exist.
        if(document.getElementById(slot.id) != null) {
            return;
        }

        const slotElement = document.createElement('div');
        slotElement.classList.add('slot');
        slotElement.id = slot.id;

        slotElement.addEventListener('click', () => handleInteraction(slot.id));
        slotElement.addEventListener('mouseover', () => slot.card === undefined ? null : showCardPreview(imageUrl));

        document.getElementById('game-board').appendChild(slotElement);
    });

    // Deck.
    model.players.forEach((player, i) => {
        const deckId = player.deck.id;
        // TODO: Only render when element doesn't yet exist.
        if(document.getElementById(deckId) != null) {
            return;
        }

        const deckElement = document.createElement('div');
        deckElement.classList.add(`deck-player${i + 1}`);
        deckElement.id = deckId;

        deckElement.addEventListener('click', () => handleInteraction(deckId));
    });

    // Lanes.
    model.board.lanes.forEach((lane, i) => {
        // Render single Lane.
        // TODO: Only render when element doesn't yet exist.
        if(document.getElementById(lane.id) != null) {
            return;
        }

        const cssClass = `lane lane-${i} lane-${lane.orientation}`;

        const laneElement = document.createElement('div');
        laneElement.classList.add(...cssClass.split(' '));
        laneElement.id = lane.id;

        // Render Power indicator for this lane.
        const powerPlayerEntries = lane.$properties().$power;

        const powerIndicator = document.createElement('div');
        powerIndicator.innerHTML = powerPlayerEntries.map(
                (e, i) => `<span class="player${i + 1}">${e.power}</span>`
            ).join(' / ');
        powerIndicator.classList.add('power-indicator');
        laneElement.appendChild(powerIndicator);

        const board = document.getElementById('game-board');
        board.appendChild(laneElement);
    });

    // Crystal Zones.
    model.players.forEach((player, i) => {
        // Render Crystal Zones
        const crystalZoneId = player.crystalZone.id;

        if(document.getElementById(crystalZoneId) != null) {
            return;
        }

        const crystalZoneElement = document.createElement('div');
        crystalZoneElement.id = crystalZoneId;
        crystalZoneElement.classList.add('crystalzone', `player${i + 1}-crystalzone`);

        const playerArea = document.getElementById(`player${i + 1}-area`);
        playerArea.appendChild(crystalZoneElement);
    });

    // Hand.
    model.players.forEach((player, i) => {
        const handId = player.hand.id;

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
    model.players.forEach((player, i) => {
        const hand = document.getElementById(player.hand.id);

        player.hand.forEach(card => {
            const imageUrl = `url('${resolveCardArt(card.Name)}')`;

            // TODO: Only render when element doesn't yet exist.
            if(document.getElementById(card.id) != null) {
                return;
            }

            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.style.backgroundImage = imageUrl;
            cardElement.id = card.id;

            cardElement.addEventListener('mouseover', () => showCardPreview(imageUrl));
            cardElement.addEventListener('click', () => handleInteraction(card.id));

            hand.appendChild(cardElement);
        });
    });
};

// MODEL.
let state = {
    wonBy: undefined,
    currentPlayer: 0,
    board: {
        slots: Array(5).fill().map((_, x) => Array(4).fill().map((_, y) => {
            const slot = {
                card: undefined,
                x: x,
                y: y
            };

            return identify(slot, ['slot']);
        })).flat(),
        lanes: [
            // 4 Horizontal Lanes
            ...Array(4).fill().map((_, i) => {
                // Each Lane definition
                const $slots = () => state.board.slots.filter(slot => slot.y === i);
                const lane = {$properties: initializeLane($slots), orientation: 'horizontal'};

                return identify(lane, ['lane', 'horizontal-lane']);
            }),
            // 5 Vertical Lanes
            ...Array(5).fill().map((_, i) => {
                // Each Lane definition
                const $slots = () => state.board.slots.filter(slot => slot.x === i);
                const lane = {$properties: initializeLane($slots), orientation: 'vertical'};

                return identify(lane, ['lane', 'vertical-lane']);
            })
        ]
    },
    players: [
        createPlayerDefaultSettings('Shrenrin'),
        createPlayerDefaultSettings('Drassi')
    ]
};

// ACTION DICTIONARY
const actions = new Proxy({
    draw: {
        execute: (player) => {
            player.hand.push(player.deck.pop());
        },
        log: (player) => `Player ${player.name} drew a card.`
    }
}, {
    get: (target, prop, _receiver) => {
        const response = target[prop];

        // Automatically execute logging on action execution.
        return new Proxy(response.execute, {
            apply: (target, thisArg, argArray) => {
                log(response.log(...argArray));

                target.apply(thisArg, argArray);
                tick();
            }
        });
    }
});

// SCRIPT
document.addEventListener('DOMContentLoaded', async () => {
    const request = await fetch(cardFile);
    const cards = (await request.json())
        .filter(card => card.Set == 1); // Only valid cards from Set 1 should be made into decks.

    log(`Loaded a total of ${cards.length} cards!`, true);

    // Fill each Players deck with 30 random cards.
    state.players.forEach(player => {
        Array(30).fill().forEach(() => {
            const randomCard = cards[Math.floor(Math.random() * cards.length)];

            // Add ownership to cards.
            player.deck.push({...identify(randomCard, ['card']), owner: player.id});
        });
    });

    // Randomize starting player.
    state.currentPlayer = state.players[Math.floor(Math.random() * state.players.length)];

    // Each Player draws 5 cards from their Deck.
    state.players.forEach(player => {
        Array(5).fill().forEach(() => {
            actions.draw(player);
        })
    });

    console.log('State after initialization:', state);
});