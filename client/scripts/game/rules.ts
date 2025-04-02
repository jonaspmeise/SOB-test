import { GameEngine } from "../engine/engine";
import { Rule } from "../engine/types-engine";
import { BeyondPlayer, Card, ShardsOfBeyondActionType, Slot, Turn } from "./types-game";

export const OnlyOneCrystallizePerTurnRule: Rule<{alreadyCrystallized: number[]}> = {
  name: 'Players may crystallize one card during their Turn from their Hand.',
  properties: {
    // Track per Player how many cards they crystallized already.
    alreadyCrystallized: [0, 0]
  },
  handler: (engine: GameEngine<ShardsOfBeyondActionType>, properties) => {
    const turn = engine.components.get(engine.types.get('turn')![0])! as Turn;
    const players = engine.types.get('player')!.map(id => engine.components.get(id))! as BeyondPlayer[];

    return players.map(player => {
      // If it's not your Turn, do nothing.
      if(turn.currentPlayer !== player.id) {
        return undefined;
      }
      
      // If already crystallized, they may not crystallize.
      if(properties.alreadyCrystallized[player.index] > 0) {
        return undefined;
      }

      return player.hand.map(card => {
        return {
          actor: player.meta.actorId,
          actionType: 'crystallize',
          arguments: [card],
          execute: () => engine.actions.crystallize(card),
          callback: () => properties.alreadyCrystallized[player.index]++
        };
      });
    })
    .filter(action => action !== undefined)
    .flat();
  }
};

export const OnlyOnePlayPerTurnRule: Rule<{alreadyPlayed: number[]}> = {
  name: 'Players may play a single Card from their Hand during their Turn.',
  properties: {
    // Track per Player how many cards they played already.
    alreadyPlayed: [0, 0]
  },
  handler: (engine: GameEngine<ShardsOfBeyondActionType>, properties) => {
    // TODO: These types _hurt_ - both readability and performance probably.
    const players = engine.types.get('player')?.map(player => engine.components.get(player)) as BeyondPlayer[];
    const turn = engine.components.get(engine.types.get('turn')![0])! as Turn;

    return players.map(player => {
      // If it's not your Turn, do nothing.
      if(turn.currentPlayer !== player.id) {
        return undefined;
      }
      // If already crystallized, they may not crystallize.
      if(properties.alreadyPlayed[player.index] > 0) {
        return undefined;
      }

      return player.hand.map(cardId => {
        // You may only summon the Card if you meet its requirements.
        // Card too expensive....
        const card = engine.components.get(cardId) as Card;

        console.error(`${card} -> ${player.crystalzone.supports(card.costs)}`);
        if(!player.crystalzone.supports(card.costs)) {
          return undefined;
        }

        // May summon in a free Slot.
        return engine.types.get('slot')!
          .map(id => engine.components.get(id)! as Slot)
          .filter(slot => slot.card === undefined)
          .map(slot => slot.id)
          .map(slotId => {
            return {
              actor: player.meta.actorId,
              actionType: 'summon',
              arguments: [cardId, slotId],
              execute: () => engine.actions.summon(cardId, slotId),
              callback: () => properties.alreadyPlayed[player.index]++
            };
          });
      }).flat();
    })
    .flat()
    .filter(action => action !== undefined);
  }
};

export const SHARDS_OF_BEYOND_RULES: Rule<any>[] = [
  OnlyOneCrystallizePerTurnRule,
  OnlyOnePlayPerTurnRule,
  {
    name: 'Players may pass their Turn during their Turn.',
    handler: (engine: GameEngine<ShardsOfBeyondActionType>) => {
      const turn = engine.components.get(engine.types.get('turn')![0])! as Turn;

      return [{
        actor: (engine.components.get(turn.currentPlayer)! as BeyondPlayer).meta.actorId,
        actionType: 'pass',
        arguments: [turn.id],
        execute: () => engine.actions.pass(turn.currentPlayer, turn.id)
      }];
    }
  } as Rule<undefined>
];