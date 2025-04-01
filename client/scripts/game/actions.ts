import { GameEngine } from "../engine/engine";
import { Action, ID } from "../engine/types-engine";
import { BeyondPlayer, Card, CrystalZone, Deck, Lane, OwnedContainer, Slot, Turn } from './types-game';

export const SHARDS_OF_BEYOND_ACTIONS: Action<?, ?, ?>[] = [
  {
    name: 'draw',
    execute: (engine: GameEngine, deck: Deck) => {
      const player = engine.components.get(deck.owner) as BeyondPlayer;
      
      // TODO: Draw cards from empty deck => return undefined on errorneous behaviour?
      const card: Card = engine.components.get(deck.pop()!)! as Card;

      player.hand.push(card.id as ID);
      card.location = player.hand.id;
      
      return {
        player: player, 
        deck: deck
      };
    },
    log: (parameters) => `${parameters.player} drew a card from ${parameters.deck}.`
  } as Action<{player: BeyondPlayer, deck: Deck}, Deck>,
  {
    name: 'summon',
    execute: (engine: GameEngine, card: Card, slot: Slot) => {
        const player = engine.components.get(card.owner) as BeyondPlayer!;
        slot.card = card.id; // Move card to slot.

        // Remove card from previous location (either zone or slot!).
        const previousLocation: OwnedContainer = engine.components.get(card.location!)! as OwnedContainer;

        // Modify the existing container by rewriting the reference.
        previousLocation.splice(previousLocation.indexOf(card.id), 1);
        
        card.location = slot.id; // Reference card to slot.

        return {
            player: player,
            card: card,
            slot: slot
        };
    },
    log: (parameters) => `${parameters.player} summoned ${parameters.card} into Slot ${parameters.slot}.`,
    color: 'blue'
  } as Action<{player: BeyondPlayer, card: Card, slot: Slot}, Card, Slot>,
  {
    name: 'crystallize',
    execute: (engine: GameEngine, card: Card, crystalzone: CrystalZone) => {
        const player = engine.components.get(card.owner) as BeyondPlayer!;

        crystalzone.push(card.id);
        // Remove card from previous location.
        const previousLocation: Slot | OwnedContainer = engine.components.get(card.location!)! as (Slot | OwnedContainer);

        // Modify the existing container by rewriting the reference.
        if(Array.isArray(previousLocation)) {
            previousLocation.splice(previousLocation.indexOf(card.id), 1);
        } else {
            // Otherwise it has to be a Slot.
            previousLocation.card = undefined;
        }
        
        card.location = crystalzone.id; // Reference card to slot.

        return {
            player: player,
            card: card
        };
    },
    log: (parameters) => `${parameters.player} crystallized ${parameters.card}.`,
    color: 'darkgoldenrod'
  } as Action<{player: BeyondPlayer, card: Card}, Card, CrystalZone>,
  {
    name: 'pass',
    execute: (engine: GameEngine, player: BeyondPlayer, turn: Turn) => {
        // Change active player to other Player.
        const oldPlayerId = turn.currentPlayer;

        // Switch turn to other Player!
        const nextPlayerId: ID = engine.types.get('player')!.filter(id => id !== oldPlayerId)[0];
        
        // TODO: Does the Proxy work here?
        turn.currentPlayer = nextPlayerId;

        const nextPlayer: BeyondPlayer = engine.components.get(nextPlayerId)! as BeyondPlayer;

        return {
            previousPlayer: player,
            nextPlayer: nextPlayer
        }
    },
    log: (parameters) => `${parameters.previousPlayer} passed their Turn to ${parameters.nextPlayer}.`,
    color: 'green'
    }  as Action<{previousPlayer: BeyondPlayer, nextPlayer: BeyondPlayer}, BeyondPlayer, Turn>,
    {
        name: 'conquer',
        execute: (engine: GameEngine, player: BeyondPlayer, lane: Lane) => {
            lane.wonBy = player.id;
            player.wonLanes = player.wonLanes + 1;

            return {
                player: player,
                lane: lane
            }
        },
        log: (parameters) => `${parameters.player} conquers ${parameters.lane}.`,
        color: undefined // This is never an action done by the player's own volition.
    } as Action<{player: BeyondPlayer, lane: Lane}, BeyondPlayer, Lane>
];
