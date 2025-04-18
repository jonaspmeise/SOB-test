import { ShardsOfBeyondActionType, Owned, Lane, Slot, Card, Player, Container, Turn, Hand, Deck, CrystalZone, RawCard, Rarity, CardType, Subtype, Realm, REALM_MAPPING } from './types-game.js';
import { GameEngine } from '../engine/engine.js';
import { Action, Component,  PlayerInterface,  PositiveRule,  QueryFilter,  Simple,  Type } from '../engine/types-engine.js';
import { range, shuffle } from '../engine/utility.js';

// TODO: Optionally accept game config parameters, which are handed from outside (player names, starting deck...?).
export const INITIALIZE_BEYOND = (
  engine: GameEngine,
  cards: RawCard[]
): void => {

  const startTime = new Date().getTime();
  
  // COMPONENTS.
  // Players
  const players = ['Görzy', 'Rashid'].map((name, i) => {
    const player = engine.registerComponent({
      name: name,
      // @ts-ignore // FIXME ???
      hand: (self, engine) => engine.query<Hand>('hand').filter(hand => hand.owner === self)[0],
      deck: (self, engine) => engine.query<Deck>('deck').filter(deck => deck.owner === self)[0],
      crystalzone: (self, engine) => engine.query<CrystalZone>('crystalzone').filter(crystalzone => crystalzone.owner === self)[0],
      index: i,
      wonLanes: (self, engine) => engine.query<Lane>('lane').filter(lane => lane.wonBy === self)
    }, 'player', name) as Simple<Player>;

    const hand = engine.registerComponent({
      owner: player,
      cards: (self, engine) => engine.query<Card>('card').filter(c => c.location === self)
    }, 'hand', `${name}'s Hand`) as Simple<Hand>;

    const crystalzone = engine.registerComponent({
      owner: player,
      cards: (self, engine) => engine.query<Card>('card').filter(c => c.location === self)
    }, 'crystalzone', `${name}'s Crystal Zone`) as Simple<CrystalZone>;
    
    const deck = engine.registerComponent({
      owner: player,
      cards: (self, engine) => engine.query<Card>('card').filter(c => c.location === self)
    }, 'deck', `${name}'s Hand`) as Simple<Deck>;

    // Initialize 30 random cards and add them to each Deck!
    shuffle(cards).slice(0, 30)
      .filter(card => card.Cardtype === 'Unit')
      .map(card => {
        console.debug(`Loading ${card.Name}...`);

        engine.registerComponent({
          owner: player,
          name: card.Name,
          artwork: new URL(`https://cdn.shardsofbeyond.com/artworks/${card.Artworks.default}`),
          rarity: card.Rarity as Rarity,
          set: card.Set,
          power: card.Power,
          text: card.Text,
          cardtype: card.Cardtype as CardType,
          realms: card.Realms?.split(' ').map(part => part.trim()) as Realm[] ?? [],
          subtypes: card.Types?.split(' ').map(part => part.trim()) as Subtype[] ?? [],
          costs: card.Costs.split(',')
            .map(realm => realm.trim())
            .reduce((prev, curr) => {
              const realm: Realm | undefined = REALM_MAPPING.get(curr);

              if(realm === undefined) {
                console.error(`The part "${curr}" is not a valid cost!`);
                return prev;
              }
              
              prev[realm] = prev[realm] + 1;
              prev['total'] = prev['total'] + 1;

              return prev;
            }, {
              'Divine': 0,
              'Mortal': 0,
              'Elemental': 0,
              'Nature': 0,
              'Void': 0,
              'NO_REALM': 0,
              'total': 0
            }),
          location: deck
        }, 'card', card.Name) as Simple<Card>;
      });

      return player;
    });

  // TURN
  const turn = engine.registerComponent({
    currentPlayer: players[0]
  }, 'turn', 'Turn') as Simple<Turn>;

  // Horizontal Lanes.
  range(4).forEach(i => {
    engine.registerComponent({
      index: i,
      slots: (self, engine) => engine.query<Slot>('slot').filter(slot => slot.y === self.index),
      cards: (self) => self.slots.filter(slot => slot.card !== undefined).map(slot => slot.card as Simple<Card>),
      isFull: (self) => self.slots.length === self.cards.length,
      wonBy: undefined,
      orientation: 'horizontal'
    }, 'lane', `Horizontal Lane ${i + 1}`) as Simple<Lane>;
  });

  // Vertical Lanes.
  range(5).forEach(i => {
    engine.registerComponent({
      index: i,
      slots: (self, engine) => engine.query<Slot>('slot').filter(slot => slot.x === self.index),
      cards: (self) => self.slots.filter(slot => slot.card !== undefined).map(slot => slot.card as Simple<Card>),
      isFull: (self) => self.slots.length === self.cards.length,
      wonBy: undefined,
      orientation: 'vertical'
    }, 'lane', `Vertical Lane ${i + 1}`) as Simple<Lane>;
  });

  // Slots
  range(4).forEach(x => range(5).forEach(y => {
    engine.registerComponent({
      x: x,
      y: y,
      card: (self, engine) => engine.query<Card>('card').filter(card => card.location === self)[0],
      lanes: (self, engine) => engine.query<Lane>('lane').filter(lane => lane.slots.includes(self))
    }, 'slot', `Slot ${x}/${y}`) as Simple<Slot>;
  }));

  // ACTIONS
  const ACTION_PASS = engine.registerAction({
    name: 'pass',
    context: (engine, entrypoint) => {
      const turn = engine.query<Turn>('turn')[0];

      return {
        player: turn.currentPlayer,
        turn: turn
      };
    },
    message: () => 'Pass your Turn.',
    execute: (engine, context) => {
      const otherPlayer = engine.query<Player>('player').filter(player => player.id !== context.player.id)[0];
      // @ts-ignore FIXME
      context.turn.currentPlayer = otherPlayer;

      return {
        previous: context.player,
        next: otherPlayer
      };
    },
    log: (context) => `${context.previous} passed their Turn to ${context.next}.`
  }) as Action<{}, {player: Simple<Player>, turn: Simple<Turn>}, {previous: Simple<Player>, next: Simple<Player>}>;

  const ACTION_DRAW = engine.registerAction({
    name: 'draw',
    context: (engine, entrypoint) => {
      return {
        player: entrypoint.card.owner,
        card: entrypoint.card
      };
    },
    message: () => 'Draw a Card.',
    execute: (engine, context) => {      
      context.card.location = context.player.hand;

      return {
        card: context.card,
        player: context.player
      };
    },
    log: (context) => `${context.player} drew ${context.card}.`
  }) as Action<{card: Card}, {player: Simple<Player>, card: Simple<Card>}, {card: Simple<Card>, player: Simple<Player>}>;

  const ACTION_CONQUER = engine.registerAction({
    name: 'conquer',
    context: (engine, entrypoint) => entrypoint,
    message: () => 'Conquer this Lane.',
    execute: (engine, context) => {
      context.lane.wonBy = context.player;

      return {
        lane: context.lane,
        player: context.player
      };
    },
    log: (context) => `${context.player} conquered ${context.lane}.`
  }) as Action<{lane: Lane, player: Player}, {player: Simple<Player>, lane: Simple<Lane>}>;

  const ACTION_SUMMON = engine.registerAction({
    name: 'summon',
    context: (engine, entrypoint) => {
      return {
        ...entrypoint,
        player: entrypoint.card.owner
      }
    },
    message: () => 'Summon.',
    execute: (engine, context) => {
      context.card.location = context.slot;

      return context;
    },
    log: (context) => `${context.card} was summoned into ${context.slot}.`
  }) as Action<{card: Card, slot: Slot}>;
  
  const ACTION_CRYSTALLIZE = engine.registerAction({
    name: 'crystallize',
    context: (engine, entrypoint) => entrypoint,
    message: () => 'Crystallize.',
    execute: (engine, context) => {
      // @ts-ignore FIXME
      context.card.location = context.card.owner.crystalzone;

      return context;
    },
    log: (context) => `${context.card} was crystallized into ${context.card.owner.crystalzone}.`
  }) as Action<{card: Card}>;

  // This doesnt have any logic, because it's purely symbolic.
  const ACTION_START_TURN = engine.registerAction({
    name: 'start-turn',
    context: (engine, entrypoint) => entrypoint,
    message: () => 'Start your Turn.',
    execute: (engine, context) => context,
    log: (context) => `${context.player}'s Turn starts.`
  }) as Action<{player: Player}>

  // RULES
  const RULE_CRYSTALLIZE_DEFAULT = engine.registerRule({
    id: 'crystallize-one-card-per-turn',
    name: 'Players may crystallize one card during their Turn from their Hand.',
    type: 'positive',
    properties: {
      alreadyCrystallized: [0, 0]
    },
    handler: (engine, properties) =>
      engine.players<Player>().map(int => {
        const player = int.avatar! as Simple<Player>;

        // Only allow Players that have _not_ crystallized with this yet!
        if(properties.alreadyCrystallized[player.index] > 0) {
          return;
        }

        return player.hand.cards.map(card => {
          return {
            player: int,
            action: ACTION_PASS,
            entrypoint: {card: card}
          };
        });
      })
      .filter(r => r !== undefined)
      .flat()
    }) as PositiveRule<typeof ACTION_PASS, {alreadyCrystallized: number[]}>;

  const RULE_PLAY_DEFAULT = engine.registerRule({
    id: 'play-one-card-per-turn',
    name: 'Players may play one card during their Turn into a free Slot from their Hand.',
    type: 'positive',
    properties: {
      alreadyPlayed: [0, 0]
    },
    handler: (engine, properties) =>
      engine.players<Player>().map(int => {
        const player = int.avatar! as Simple<Player>;
        const freeSlots: Simple<Slot>[] = engine.query<Slot>('slot').filter(slot => slot.card === undefined);

        // Only allow Players that have _not_ played with this yet!
        if(properties.alreadyPlayed[player.index] > 0) {
          return;
        }

        return player.hand.cards.map(card => freeSlots.map(slot => {
          return {
            player: int,
            action: ACTION_SUMMON,
            entrypoint: {card: card, slot: slot}
          };
        })).flat();
      })
      .filter(r => r !== undefined)
      .flat()
    }) as PositiveRule<typeof ACTION_SUMMON, {alreadyPlayed: number[]}>;

  const RULE_PASS_TURN = engine.registerRule({
    id: 'turn-may-be-passed',
    name: 'Players may pass their Turn during their Turn.',
    type: 'positive',
    handler: (engine) => {
      return engine.players().map(player => {
        if(engine.query<Turn>('turn')[0].currentPlayer !== player.avatar!) {
          return;
        }

        return {
          player: player,
          action: ACTION_PASS,
          entrypoint: {}
        };
      })
      .filter(a => a !== undefined);
    }
  }) as PositiveRule<typeof ACTION_PASS>  

  // TRIGGERS
  // TODO: Types that link Triggers to actions!
  const TRIGGER_RESET_LIMIT = engine.registerTrigger({
    name: 'Default Actions for Crystallize / Play reset after each Turn.',
    actionTypes: ['pass'],
    execute: (engine, actionType, context) => {  
      return [
        () => {
          engine.getRule<typeof RULE_CRYSTALLIZE_DEFAULT>('crystallize-one-card-per-turn').properties!.alreadyCrystallized = [0, 0];
          engine.getRule<typeof RULE_PLAY_DEFAULT>('play-one-card-per-turn').properties!.alreadyPlayed = [0, 0];
        }
      ];
    }
  });

  engine.registerTrigger({
    name: 'Whenever your Turn starts, draw a Card.',
    actionTypes: ['start-turn'],
    // TODO: Prior Triggers should consume Context, After Triggers used Parameters!
    execute: (engine, actionType, context: any) => {
      // TODO: How to execute an Action here?
      (context.player as unknown as Simple<Player>)

      return [];
    }
  });

  const endTime = new Date().getTime();
  console.info(`Loaded game in ${(endTime - startTime) / 1000} seconds.`);
};