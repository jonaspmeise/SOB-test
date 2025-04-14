import { GameEngine } from "../engine/engine.js";
import { Action, ID, Simple } from "../engine/types-engine.js";
import { ActionColors, Card, CrystalZone, Deck, Lane, Player, ShardsOfBeyondActionType, Slot, Turn } from './types-game.js';

/*
export const PassAction = {
  name: 'pass',
  execute: (engine: GameEngine<ShardsOfBeyondActionType>, player: BeyondPlayer, turn: Turn) => {
    // Change active player to other Player.
    const oldPlayerId = turn.currentPlayer;

    // Switch turn to other Player!
    const nextPlayerId: ID = engine.types.get('player')!.filter(id => id !== oldPlayerId)[0];
    
    // TODO: Does the Proxy work here?
    turn.currentPlayer = nextPlayerId;

    const nextPlayer: BeyondPlayer = engine.components.get(nextPlayerId) as BeyondPlayer;

    return {
      previousPlayer: player,
      nextPlayer: nextPlayer
    }
  },
  log: (parameters) => `${parameters.previousPlayer} passed their Turn to ${parameters.nextPlayer}.`,
}  as Action<ShardsOfBeyondActionType, {previousPlayer: BeyondPlayer, nextPlayer: BeyondPlayer}, BeyondPlayer, Turn>;

export const ConquerAction = {
  name: 'conquer',
  execute: (engine: GameEngine<ShardsOfBeyondActionType>, player: BeyondPlayer, lane: Lane) => {
    player.wonLanes = [...player.wonLanes, lane.id];

    return {
      player: player,
      lane: lane
    }
  },
  log: (parameters) => `${parameters.player} conquers ${parameters.lane}.`,
  color: undefined // This is never an action done by the player's own volition.
} as Action<'conquer', {player: BeyondPlayer, lane: Lane}, BeyondPlayer, Lane>;

export const DrawAction = {
  name: 'draw',
  execute: (engine: GameEngine<ShardsOfBeyondActionType>, deck: Deck) => {
    const player = engine.components.get(deck.owner) as BeyondPlayer;
    
    // TODO: Draw cards from empty deck => return undefined on errorneous behaviour?
    const card: Card = engine.components.get(deck.pop()!) as Card;

    player.hand.push(card.id as ID);
    card.location = player.hand.id;
    
    return {
      player: player, 
      deck: deck
    };
  },
  log: (parameters) => `${parameters.player} drew a card from ${parameters.deck}.`
} as Action<'draw', {player: BeyondPlayer, deck: Deck}, Deck>; // Draw funnily enough targets the Deck, because this is the main Interaction that a Player is doing when deciding between different Actions.

export const SummonAction = {
  name: 'summon',
  execute: (engine: GameEngine<ShardsOfBeyondActionType>, card: Card, slot: Slot) => {
    const player = engine.components.get(card.owner) as BeyondPlayer;
    slot.card = card.id; // Move card to slot.

    // Remove card from previous location (either zone or slot!).
    const previousLocation: OwnedContainer = engine.components.get(card.location!) as OwnedContainer;

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
} as Action<'summon', {player: BeyondPlayer, card: Card, slot: Slot}, Card, Slot>;

export const CrystallizeAction = {
  name: 'crystallize',
  execute: (engine: GameEngine<ShardsOfBeyondActionType>, card: Card) => {
    const player = engine.components.get(card.owner) as BeyondPlayer;

    player.crystalzone.push(card.id);
    // Remove card from previous location.
    const previousLocation: Slot | OwnedContainer = engine.components.get(card.location!) as (Slot | OwnedContainer);

    // Modify the existing container by rewriting the reference.
    if(Array.isArray(previousLocation)) {
        previousLocation.splice(previousLocation.indexOf(card.id), 1);
    } else {
        // Otherwise it has to be a Slot.
        previousLocation.card = undefined;
    }
    
    card.location = player.crystalzone.id; // Reference card to slot.

    return {
      player: player,
      card: card
    };
  },
  log: (parameters) => `${parameters.player} crystallized ${parameters.card}.`,
} as Action<'crystallize', {player: BeyondPlayer, card: Card}, Card>;
*/