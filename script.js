// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

// CONSTANTS
const cardFile = './cards.json';

// HELPER FUNCTIONS
const componentMap = new Map();

let counter = 0;
const identify = (obj, types, name) => {
    console.debug(`Registering component of types "${types}" with ID ${counter}...`);
    obj.id = counter;
    obj.types = types;
    obj.name = name;
    obj.toString = () => name;
    componentMap.set(counter, obj);

    counter++;
    
    return obj;
};

const createPlayerDefaultSettings = (name) => {
    const createOwnedContainer = (id) => {
        const container = [];
        container.owner$ = id;

        return container;
    };

    let player = identify({}, ['player'], name);
    let crystalzone = identify(createOwnedContainer(player.id), ['crystalzone'], `${name}'s Crystal Zone`);
    crystalzone.realmCounts = {
        Divine: 0,
        Elemental: 0,
        Mortal: 0,
        Nature: 0,
        Void: 0
    };
    crystalzone.total = 0;
    crystalzone.owner$ = player.id;

    player = {...player,
        deck$: identify(createOwnedContainer(player.id), ['deck'], `${name}'s Deck`),
        hand$: identify(createOwnedContainer(player.id), ['hand'], `${name}'s Hand`),
        crystalzone$: crystalzone
    };
    componentMap.set(player.id, player);

    return player;
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
    console.log('...tack', state);

    // Render state.
    render(state);

    // Calculate action space for both players.
    state.actions = [
        // If an action like that is "found", update the UI for it, too.
        {actor: 32, type: 'draw', args: [null, 31]},
        {actor: 66, type: 'summon', args: [32, 66, 15]},
        {actor: 66, type: 'summon', args: [32, 66, 16]},
        {actor: 66, type: 'summon', args: [32, 66, 17]},
        {actor: 66, type: 'summon', args: [32, 66, 18]},
        {actor: 66, type: 'summon', args: [32, 66, 19]},
        {actor: 66, type: 'crystallize', args: [32, 66, 30]}
    ];

    console.info('Current action space:', state.actions);
};

const preview = document.getElementById('card-preview');

const showCardPreview = (card$) => {
    preview.style.backgroundImage = getCardArtUrl(card$);
    preview.style.display = 'block';
};

const hideCardPreview = () => {
    preview.style.display = 'none';
};

// TODO: AI should simply do a random action from its action space, whenever feasible.
// TODO: This should be an Object with Type -> Args, but for now we only accept single types.
let handleContextArguments = {};
const resetHandleContext = () => {
    // Reset context and disable highlight!
    handleContextArguments = {};
    console.debug('Resetting all highlights');
    document.querySelectorAll('.highlight').forEach(e => e.classList.remove('highlight'));
};
const handleInteraction = (id) => {
    const component = componentMap.get(id);
    log(`${state.currentPlayer} interacted with ${component} (#${id})`, true);

    // Is there a discerning action that triggers if we interact with this component?
    if(id in handleContextArguments) {
        const info = handleContextArguments[id];

        // Try and deduct the true arguments for this action call, if feasible.
        // If there are still choices left, we need to repeat the process.

        let resolved = true;
        const appliedChoiceParameters = info.choices.map(parameter => {
            // If there is no choice, we just accept this parameter.
            if(!Array.isArray(parameter)) {
                return parameter;
            }

            // If our interaction narrows down a choice, we accept this as our parameter.
            if(parameter.includes(id)) {
                return id;
            }

            // We had a choice, but couldn't narrow it down - this action can't be resolved yet!
            resolved = false;
            return parameter;
        });

        if(resolved) {
            console.info(`Narrowed down interaction for ${info.type}: ${appliedChoiceParameters}!`);
            actions[info.type](...appliedChoiceParameters);
            return;
        } else {
            resetHandleContext();
        }
    }

    console.debug('Before filtering actions:', component.types, state.actions);
    const possibleActions = state.actions
        // filter out actions that are not accessible through this interaction.
        .filter(action => {
            console.debug('Action debug: ', RAW_ACTION_DICTIONARY[action.type]);
            return component.types.includes(RAW_ACTION_DICTIONARY[action.type].target);
        })
        // filter out actions where the current component is not part of its targets.
        .filter(action => {
            console.debug('Action debug #2: ', id, action.args);
            return action.args.includes(id);
        });
        // TODO: Filter only one's own actions (player)!

    console.debug('After filtering actions:', possibleActions);

    if(possibleActions.length == 1) {
        const action = possibleActions[0];

        // Execute chosen action.
        actions[action.type](...action.args);
    } else {
        console.debug('Possible actions for selected Component:', possibleActions);

        const possibleActionTypes = [...new Set(possibleActions.map(action => action.type))];
        console.info('Possible action types:', possibleActionTypes);

        // TODO: Calculate the discerning information between all action types.
        possibleActionTypes.forEach(targetAction => {
            // Find "spread" of components to calculate the possible selection from.
            const context = possibleActions
                .filter(action => action.type === targetAction)
                .map(action => action.args)
                .reduce((prev, current) => {
                    if(prev.length === 0) {
                        return current.map(v => [v]);
                    }

                    return prev.map((v, i) => [...v, current[i]]);
                } ,[])
                // If there is no "real" choice for a certain parameter, that is good!
                // Otherwise we map all choices into an array.
                .map(choice => {
                    if(new Set(choice).size === 1) {
                        return choice[0];
                    }

                    return choice;
                });

            const choices = context
                // .filter(parameter => Array.isArray(parameter))
                .flat();
            // Update all "chooseable" elements in the UI.
            choices
                .forEach(id => {
                    if(id in handleContextArguments) {
                        console.warn(`Interaction with ${componentMap.get(id)} would not have an unique result. Clash between "${handleContextArguments[id].type}" and "${targetAction}".`)
                        handleContextArguments[id] = null;
                        return;
                    }

                    // We already found out that interactions with this component don't help - we skip it!
                    if(handleContextArguments[id] === null) {
                        return;
                    }

                    handleContextArguments = {
                        ...handleContextArguments,
                        [id]: {type: targetAction, choices: context}
                    };
                });
        });
        
        // Add highlights to all discerning information
        Object.entries(handleContextArguments)
            .filter(([k, v]) => v != null)
            .forEach(([k, _]) => {
                console.log('Highlighting ', k);
                const element = document.getElementById(k);
                element.classList.add('highlight');
            });
        console.debug('Action context is: ', handleContextArguments);
    }
};

// Events: When clicking "anywhere else", reset the handleContext.
document.body.addEventListener('click', () => {
    resetHandleContext();
});

const initializeLane = ($slots) => (() => {
    const lane = {
        orientation: 'horizontal',
        $slots: $slots,
        $power: () => state.players.map(player => {
            return {
                player$: player.id,
                power: $slots()
                    .map(slot => slot.card$)
                    .filter(id => id !== undefined)
                    .map(id => componentMap.get(id))
                    .filter(card => card.owner$ == player.id)
                    .reduce((prev, curr) => prev + curr.Power, 0)
            };
        })
    };

    return lane;
});

// TODO: Make either idempotent or only render diff!
const resolveCardArt = (name) => `https://cdn.shardsofbeyond.com/rashid-test/${name.toLowerCase().replaceAll(/\W/g, '')}.png`;
const getCardArtUrl = (card$) => card$ === undefined ? null : `url('${resolveCardArt(componentMap.get(card$).Name)}')`;
const getRawCardArtUrl = (card$) => card$ === undefined ? null : `url('https://cdn.shardsofbeyond.com/rashid-test/${componentMap.get(card$)['Artwork-default']}.png')`;
const gameBoardElement = document.getElementById('game-board');

const render = (model) => {
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

            if(cardElement == null) {
                const imageUrl = getCardArtUrl(cardId);

                cardElement = document.createElement('div');
                cardElement.id = cardId;
                cardElement.classList.add('card');
                cardElement.style.backgroundImage = imageUrl;
                
                cardElement.addEventListener('mouseover', () => showCardPreview(cardId));
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
        player.crystalzone$.forEach(card => {
            const cardId = card;

            let cardElement = crystalzoneElement.querySelector(`[id="${cardId}"]`);
            if(cardElement == null) {
                cardElement = document.createElement('div');
                cardElement.id = cardId;
                cardElement.classList.add('card');
                cardElement.style.backgroundImage = getRawCardArtUrl(cardId);

                cardElement.addEventListener('mouseover', () => showCardPreview(cardId));
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
            let cardElement = document.getElementById(cardId);
            if(cardElement == null) {
                cardElement = document.createElement('div');
                cardElement.classList.add('card');
                cardElement.id = cardId;
                cardElement.style.backgroundImage = getCardArtUrl(cardId);

                cardElement.addEventListener('mouseover', () => showCardPreview(cardId));
                cardElement.addEventListener('click', e => {
                    handleInteraction(cardId);
                    e.stopPropagation();
                });
                
                handElement.appendChild(cardElement);
            }
        });
    });

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

// MODEL.
let state = {
    wonBy: undefined,
    currentPlayer: 0,
    board: {
        slots: Array(4).fill().map((_, y) => Array(5).fill().map((_, x) => {
            return identify({
                card$: undefined,
                x: x,
                y: y
            }, ['slot'], `Slot ${x + 1}/${y + 1}`);
        })).flat(),
        lanes: [
            // 4 Horizontal Lanes
            ...Array(4).fill().map((_, i) => {
                // Each Lane definition
                const $slots = () => state.board.slots.filter(slot => slot.y === i);
                const lane = {$properties: initializeLane($slots), orientation: 'horizontal'};

                return identify(lane, ['lane', 'horizontal-lane'], `Horizontal Lane ${i + 1}`);
            }),
            // 5 Vertical Lanes
            ...Array(5).fill().map((_, i) => {
                // Each Lane definition
                const $slots = () => state.board.slots.filter(slot => slot.x === i);
                const lane = {$properties: initializeLane($slots), orientation: 'vertical'};

                return identify(lane, ['lane', 'vertical-lane'], `Vertical Lane ${i + 1}`);
            })
        ]
    },
    players: [
        createPlayerDefaultSettings('Shrenrin'),
        createPlayerDefaultSettings('Drassi')
    ],
    actions: []
};

// ACTION DICTIONARY
const RAW_ACTION_DICTIONARY = {
    draw: {
        execute: (player = null, deck$) => {
            // Default to Player's Deck.
            if(player == null) {
                player = componentMap.get(deck$.owner$);
            }
            const card = componentMap.get(deck$.pop());
            player.hand$.push(card.id);
            card.location$ = player.hand$.id;
            
            return [player, deck$];
        },
        log: (player, deck$) => `Player ${player} drew a card from ${deck$}.`,
        target: 'deck'
    },
    summon: {
        execute: (player, card, slot) => {
            slot.card$ = card.id; // Move card to slot.

            // Remove card from previous location.
            const previousLocation = componentMap.get(card.location$);

            // Modify the existing container by rewriting the reference.
            if(Array.isArray(previousLocation)) {
                previousLocation.splice(previousLocation.indexOf(card.id), 1);
            } else {
                console.error('WHAT DOES THIS MEAN? WHERE IS THE COMPONENT REFERENCED? Previous location was', previousLocation);
            }
            
            card.location$ = slot.id; // Reference card to slot.

            return [player, card, slot];
        },
        log: (player, card, slot) => `Player ${player} summoned a ${card} into Slot ${slot}.`,
        target: 'card'
    },
    crystallize: {
        execute: (player, card, crystalzone$) => {
            crystalzone$.push(card.id);
            // Remove card from previous location.
            const previousLocation = componentMap.get(card.location$);

            // Modify the existing container by rewriting the reference.
            if(Array.isArray(previousLocation)) {
                previousLocation.splice(previousLocation.indexOf(card.id), 1);
            } else {
                console.error('WHAT DOES THIS MEAN? WHERE IS THE COMPONENT REFERENCED? Previous location was', previousLocation);
            }
            
            card.location$ = crystalzone$.id; // Reference card to slot.

            return [player, card, crystalzone$];
        },
        log: (player, card, crystalzone$) => `Player ${player} crystallized ${card}.`,
        target: 'card'
    },
};
const actions = new Proxy(RAW_ACTION_DICTIONARY, {
    get: (target, prop, _receiver) => {
        const response = target[prop];

        // Automatically execute logging on action execution.
        return new Proxy(response.execute, {
            apply: (target, thisArg, argArray) => {

                // References inside the arguments need to be translated to real components!
                console.debug(`Executing action ${prop} with components ${argArray}`);
                const mappedArray = argArray.map(arg => {
                    if(typeof arg != "number") {
                        return arg;
                    }

                    return componentMap.get(arg);
                });

                const usedParameters = target.apply(thisArg, mappedArray);

                // Reset handle context after action has been executed.
                resetHandleContext();
                log(response.log(...usedParameters));
                tick();
            }
        });
    }
});

// SCRIPT
document.addEventListener('DOMContentLoaded', async () => {
    const request = await fetch(cardFile);
    const cards = (await request.json())
        .filter(card => card.Set == 1) // Only valid cards from Set 1 should be made into decks.
        .filter(card => card.Cardtype === 'Unit'); // Only play with Units.

    log(`Loaded a total of ${cards.length} cards!`, true);

    // Fill each Players deck with 30 random cards.
    state.players.forEach(player => {
        Array(30).fill().forEach(() => {
            const randomCard = cards[Math.floor(Math.random() * cards.length)];

            // Add ownership to cards.
            player.deck$.push(identify({...randomCard, owner$: player.id, location$: player.deck$.id}, ['card'], randomCard.Name).id);
        });
    });

    // Randomize starting player.
    state.currentPlayer = state.players[0];

    // Each Player draws 5 cards from their Deck.
    state.players.forEach(player => {
        Array(5).fill().forEach(() => {
            actions.draw(null, player.deck$);
        });
    });

    console.log('State after initialization:', state);
});