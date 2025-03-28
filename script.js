// CONSTANTS
const cardFile = './cards.json';
const resolveCardArt = (name) => `https://cdn.shardsofbeyond.com/rashid-test/${name.toLowerCase().replaceAll(/\W/g, '')}.png`;

// HELPER FUNCTIONS
const componentMap = new Map();

let counter = 0;
const identify = (obj, type) => {
    console.log(`Registering component of type "${type}" with ID ${counter}...`);
    obj.id = counter++;
    obj.type = type;
    componentMap.set(counter, obj);

    return obj;
};

const createPlayerDefaultSettings = (name) => {
    return {
        name: name,
        deck: identify([], 'deck'),
        hand: identify([], 'hand'),
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
        }, 'crystalzone')
    };
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
    log(`${state.currentPlayer.name} interacted with ${component.type} #${id}`, true);
};

// TODO: Make either idempotent or only render diff!
const render = (model) => {
    // Cards in Hand.
    model.players.forEach((player, i) => {
        const handId = `player${i + 1}-hand`;
        const hand = document.getElementById(handId);

        player.hand.forEach(card => {
            const imageUrl = `url('${resolveCardArt(card.Name)}')`;

            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.style.backgroundImage = imageUrl;

            cardElement.addEventListener('mouseover', () => showCardPreview(imageUrl));
            cardElement.addEventListener('mouseout', hideCardPreview);
            cardElement.addEventListener('click', () => handleInteraction(card.id));

            hand.appendChild(cardElement);
        });
    });

    // Cards on Board.
    state.board.slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.classList.add('slot');
        slotElement.id = `slot-${slot.x}-${slot.y}`;

        slotElement.addEventListener('click', () => handleInteraction(slot.id));
        slotElement.addEventListener('mouseover', () => slot.card === undefined ? null : showCardPreview(imageUrl));
        slotElement.addEventListener('mouseout', () => slot.card === undefined ? null : hideCardPreview);

        document.getElementById('game-board').appendChild(slotElement);
    });

    // Deck.
    state.players.forEach((player, i) => {
        const deckId = `deck-player${i + 1}`;
        const deckElement = document.getElementById(deckId);
        console.log(player);

        console.log(player.deck);

        deckElement.addEventListener('click', () => handleInteraction(player.deck.id));
    });
};

// MODEL.
let state = {
    wonBy: undefined,
    currentPlayer: 0,
    board: {
        slots: Array(4).fill().map((_, x) => Array(5).fill().map((_, y) => {
            const slot = {
                card: undefined,
                x: x,
                y: y
            };

            return identify(slot, 'slot');
        })).flat(),
        lanes: [
            // 4 Horizontal Lanes
            ...Array(4).fill().map((_, i) => {
                // Each Lane definition
                const lane = {
                    type: 'horizontal',
                    slots: () => state.board.slots.filter(slot => slot.x === i)
                };

                return identify(lane, 'lane');
            }),
            // 5 Vertical Lanes
            ...Array(5).fill().map((_, i) => {
                // Each Lane definition
                const lane = {
                    type: 'vertical',
                    slots: () => state.board.slots.filter(slot => slot.y === i)
                };

                return identify(lane, 'lane');
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
                tick();

                target.apply(thisArg, argArray);
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

            player.deck.push(identify(randomCard, 'card'));
        });
    });

    // Each Player draws 5 cards from their Deck.
    state.players.forEach(player => {
        Array(5).fill().forEach(() => {
            actions.draw(player);
        })
    });

    // Randomize starting player.
    state.currentPlayer = state.players[Math.floor(Math.random() * state.players.length)];

    // Render initial model.
    render(state);
    console.log('State after initialization:', state);
    console.log('ID -> Component', componentMap);
});