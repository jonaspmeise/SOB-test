// $[VAR] = lazy/callable property
// [VAR]$ = component/id reference

export const componentMap = new Map();

let counter = 0;
export const identify = (obj, types, name) => {
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
    // Calculate all Realm Counts.
    crystalzone.$realmCounts = () => crystalzone
        .map(cardId => componentMap.get(cardId))
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
        crystalzone$: crystalzone
    };
    componentMap.set(player.id, player);

    return player;
};

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

export const state = {
    wonBy: undefined,
    currentPlayer: 0,
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