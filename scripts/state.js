// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

// TODO: We probably need a Map<Type, Component[]> too!
export const components = new Map();
export const types = new Map();

let counter = 0;
export const identify = (obj, objTypes, name) => {
    console.debug(`Registering component of types "${objTypes}" with ID ${counter}...`);
    obj.id = counter;
    obj.types = objTypes;
    obj.name = name;
    obj.toString = () => name;

    // Update reference maps.
    components.set(counter, obj);
    objTypes.forEach(type => {
        types.set(type, [...(types.get(type) ?? []), obj.id]);
    });

    counter++;
    
    return obj;
};

let playerCount = 0;
const createPlayerDefaultSettings = (name) => {
    const createOwnedContainer = (id) => {
        const container = [];
        container.owner$ = id;

        return container;
    };

    let player = identify({}, ['player'], name);
    let crystalzone = identify(createOwnedContainer(player.id), ['crystalzone'], `${name}'s Crystal Zone`);
    // Calculate all Realm Counts.
    crystalzone.$realmCounts = () => crystalzone
        .map(cardId => components.get(cardId))
        .reduce((prev, card) => {
            Object.keys(prev)
                .filter(realm => card.Costs.includes(realm))
                .forEach(realm => prev[realm] = prev[realm] + 1);
                
            return prev;
        }, {
            'D': 0,
            'M': 0,
            'E': 0,
            'N': 0,
            'V': 0
        });
    crystalzone.total = 0;
    crystalzone.owner$ = player.id;

    player = {...player,
        deck$: identify(createOwnedContainer(player.id), ['deck'], `${name}'s Deck`),
        hand$: identify(createOwnedContainer(player.id), ['hand'], `${name}'s Hand`),
        crystalzone$: crystalzone,
        wonLanes: 0,
        index: playerCount++
    };
    components.set(player.id, player);

    return player;
};

const initializeLane = ($slots) => (() => {
    const $power = () => state.players.map(player => {
        return {
            player$: player.id,
            power: $slots()
                .map(slot => slot.card$)
                .filter(id => id !== undefined)
                .map(id => components.get(id))
                .filter(card => card.owner$ == player.id)
                .reduce((prev, curr) => prev + curr.Power, 0)
        };
    });

    const lane = {
        orientation: 'horizontal',
        $slots: $slots,
        $power: $power,
        wonByPower$: () => {
            // If a single slot inside this Lane is empty, the Lane is considered to be not won.
            if($slots().find(slot => slot.card$ === undefined) !== undefined) {
                return undefined;
            }

            const power = $power();
            if(power[0].power === power[1].power) {
                // Draw!
                return undefined;
            } else if(power[0].power > power[1].power) {
                return power[0].player$;
            } else {
                return power[1].player$;
            }
        }
    };

    return lane;
});

export const state = {
    wonBy: undefined,
    board: {
        slots: Array(4).fill().map((_, y) => Array(5).fill().map((_, x) => {
            return identify({
                card$: undefined,
                $lanes: () => state.board.lanes
                    .filter(lane => lane.$properties().$slots()
                        .find(slot => slot.x === x && slot.y === y) !== undefined
                    ),
                x: x,
                y: y
            }, ['slot'], `Slot ${x + 1}/${y + 1}`);
        })).flat(),
        lanes: [
            // 4 Horizontal Lanes
            ...Array(4).fill().map((_, i) => {
                // Each Lane definition
                const $slots = () => state.board.slots
                    .filter(slot => slot.y === i);

                // TODO: $properties() probably is not needed here...
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
    // References all actions that can be done in a single game-state. Player-agnostic.
    actions: [],
    // References all triggers that need to be automatically resolved prior to interactions.
    triggerQueue: [],
    // Reference to the concept "Turn", which is interactable through the Turn button.
    turn: identify({
        currentPlayer$: undefined
    }, ['turn'], 'Turn')
};