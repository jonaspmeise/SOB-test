import { BeyondPlayer, ShardsOfBeyondActionType, OwnedContainer, CrystalZone, Owned, Deck, Lane, Slot, Card, Costs, REALM_MAPPING } from './types-game';
import { GameEngine } from '../engine/engine';
import { ID, Type } from '../engine/types-engine';

const createOwnedContainer = (
  engine: GameEngine<ShardsOfBeyondActionType>,
  player: BeyondPlayer,
  types: Type[],
  name: string
): OwnedContainer => {
  return engine.registerComponent((() => {
    // @ts-ignore
    const container: Owned & ID[] = [];
    container.owner = player.id;

    return container;
  })(), types, name) as OwnedContainer
};

export const INIT_SHARDS_OF_BEYOND_PLAYER: (
  engine: GameEngine<ShardsOfBeyondActionType>,
  name: string,
  index: number
) => BeyondPlayer = (
  engine,
  name,
  index
) => {
  const player = engine.registerComponent({}, 'player', name) as BeyondPlayer;

  player.name = name;
  player.wonLanes = [];
  player.crystalzone = createOwnedContainer(engine, player, ['crystalzone'], `${name}'s Crystal Zone`) as CrystalZone;
  player.crystalzone.supports = (costs: Costs) => {
    // This is actually complicated; Dual-Type Cards make this a combinatorical problem!
    const cards: Card[] = player.crystalzone.map(cardId => engine.components.get(cardId)! as Card);
    const combinations: Costs[] = [];

    if(costs.total > player.crystalzone.length) {
      return false;
    }

    // TODO: ????
    // Calculate all combinations!
    // cards.map(card => card.realms)

    if(Array.from(REALM_MAPPING.values())
      .filter(realm => realm !== 'NO_REALM')
      .find(realm => costs[realm] > cards.filter(c => c.realms.includes(realm)).length) !== undefined
    ) {
      return false;
    }

    return true;
  };
  player.deck = createOwnedContainer(engine, player, ['deck'], `${name}'s Deck`);
  player.hand = createOwnedContainer(engine, player, ['hand'], `${name}'s Hand`);
  player.index = index; // (Needed for styling!)
  player.powerPerLane = () => 
    Object.fromEntries(
      engine.types.get('lane')!
        .map(id => engine.components.get(id) as Lane)
        .map(lane => {
          return [
            lane.id,
            lane
              .map(id => engine.components.get(id) as Slot)
              .filter(slot => slot.card !== undefined)
              .reduce((prev, curr) => prev + (engine.components.get(curr.card!) as Card).power, 0)];
        })
    );

  return player;
};