import { Changes, CommunicatedChoice, Component, Components, ID, Query, Simple } from "../engine/types-engine.js";
import { Card, Lane, Player, Slot, Turn } from '../game/types-game.js';

type IdentifiableNode = Node & {id: ID};
type IdentifiableChildNode = ChildNode & {id: ID};
const gameBoardElement = document.getElementById('game-board')!;
const previewElement = document.getElementById('card-preview')!;

// This class lives very closely and is connected with our BOM.
// It in itself is stateless (except the interaction handler...)!
export class BeyondClient {

  private handleContextArguments: {
    context: Set<ID>,
    choices: CommunicatedChoice[]
  } = {
    context: new Set(),
    choices: []
  };

  public constructor() {
    // Events: When clicking "anywhere else", reset the handleContext.
    document.body.addEventListener('click', () => {
      this.resetHandleContext();
    });
  }
  
  private static showCardPreview = (card: Simple<Card>) => {
    const url = BeyondClient.getCardArtUrl(card);

    if(url == null) {
      console.error(`There is no artwork for Card ${card}!`);
      return;
    }

    previewElement.style.backgroundImage = url;
    previewElement.style.display = 'block';
  };
  
  private static resolveCardArt = (name: string) => `https://cdn.shardsofbeyond.com/client/cards/${name.toLowerCase().replace(/\W/g, '')}.png`;
  private static getCardArtUrl = (card?: Simple<Card>) => card === undefined ? null : `url('${this.resolveCardArt(card.name)}')`;
  private static getRawCardArtUrl = (card?: Simple<Card>) => card === undefined ? null : `url('https://cdn.shardsofbeyond.com/artworks/${card.artwork}')`;

  // Utility for this human client.
  private resetHandleContext = () => {
    // Reset context and disable highlight!
    this.handleContextArguments = {
      context: new Set(),
      choices: []
    };
    console.debug('Resetting all highlights');
    // this.highlight(this.choices, new Set(), true);
  };
    
  private removeDanglingNodes = (parent: IdentifiableNode, nodeFilterFunction: (id: ID) => boolean, name: string) => {
    ([
      ...parent
      .childNodes
      .values()
    ] as unknown as IdentifiableChildNode[])
    .filter(node => nodeFilterFunction(node.id))
    .forEach(node => {
      console.debug(`Removing node ${node.id} from ${name} #${parent.id} because it no longer exists there!`);
      node.remove();
    });
  };

  private handleInteraction: (id: ID) => void = (id: ID) => {
    /*
    const component = this.components.get(id)!
    log(`You interacted with ${component} (#${id})`, undefined, true);
    console.log('Context handler', this.handleContextArguments);

    // Does this interaction narrow down the choice space enough that we can execute a single action?
    if(this.handleContextArguments.choices.length > 0) {
      const narrowedDownChoices = this.handleContextArguments.choices
        .filter(choice => choice.arguments.includes(id));

      if(narrowedDownChoices.length == 1) {
        const choice = narrowedDownChoices[0];
        console.log(`Narrowed down interaction for ${choice.actionType}: ${choice.arguments}!`);

        choice.execute();
      } else if(narrowedDownChoices.length == 0) {
        console.log('Resetting context, because this interaction doesnt do anything with the choice space. Might as well reset...');
        this.resetHandleContext();
      } else {
        // We just continue with these choices!
        this.handleContextArguments.choices = narrowedDownChoices;
        this.handleContextArguments.context.add(id);

        // Add highlights to all elements that are not shared across _all_ possible actions.
        this.highlight(
          this.handleContextArguments.choices,
          this.handleContextArguments.context
        );
      }

      return;
    }

    console.debug('New Interaction - Before filtering actions:', component.types, this.choices);
    const possibleChoices = this.choices
      // filter out actions where the current component is not part of its targets.
      .filter(choice => {
          console.debug('Action debug: ', id, choice.arguments);
          return choice.arguments.includes(id);
      });
      
    console.debug('After filtering actions:', possibleChoices);

    // Execute chosen action if there is only a single one available.
    if(possibleChoices.length == 1) {
      console.info(possibleChoices);
      possibleChoices[0].execute();

      return;
    } 

    // There are many possible choices for choosing an action - we narrow it down
    // and then save the filtered combinations.
    console.debug('Possible choices for selected Component:', possibleChoices);
    if(possibleChoices.length > 0) {
      this.handleContextArguments.context.add(id);
      this.handleContextArguments.choices = possibleChoices;
    
        // Add highlights to all elements that are not shared across _all_ possible actions.
      this.highlight(
        this.handleContextArguments.choices,
        this.handleContextArguments.context
      );
    }
  };*/
  }

  private createCardElement = (card: Simple<Card>, playerIndex: number, rawArt = false) => {
    let element = document.createElement('div');
    element.id = '' + card.id;
    element.classList.add('card', `player${playerIndex + 1}`);

    if(card.realms.length > 0) {
        element.classList.add(`realm-${card.realms.join('-').toLowerCase()}`);
    }

    const imageUrl = rawArt
      ? BeyondClient.getRawCardArtUrl(card)
      : BeyondClient.getCardArtUrl(card);

    if(imageUrl !== null) {
      element.style.backgroundImage = imageUrl;
    }

    // TODO: For mobile: when pressed...
    element.addEventListener('mouseover', () => BeyondClient.showCardPreview(card));
    element.addEventListener('click', e => {
      this.handleInteraction(card.id);
      e.stopPropagation();
    });

    return element;
  };

  // Renders a given list of components with their values.
  public render = (components: Changes) => {
    // For easier access.
    const arrayComponents = Array.from(components.values());

    // These Elements are all given in the template!
    // TODO: Queries should be transmitted from the game engine, too!
    const players = (arrayComponents.filter(component => component.type === 'player') as Simple<Player>[]);
    const gameStatElement = document.getElementById('game-stats')!;
    const turn = arrayComponents.filter(component => component.type === 'turn')[0] as Simple<Turn>;

    (arrayComponents
      .filter(component => component.type === 'slot') as Simple<Slot>[])
      .forEach(slot => {
        let slotElement = document.getElementById(slot.id);

        if(slotElement == null) {
          slotElement = document.createElement('div');
          slotElement.classList.add('slot');
          slotElement.id = slot.id;

          slotElement.addEventListener('click', e => {
            this.handleInteraction(slot.id);
            e.stopPropagation();
          });

          gameBoardElement.appendChild(slotElement);
        };

        const card = slot.card;
        if(card !== undefined) {
          let cardElement = slotElement.querySelector(`[id="${card.id}"]`);

          if(cardElement == null) {
            slotElement.appendChild(this.createCardElement(card, card.owner.index));
          }

          this.removeDanglingNodes(slotElement, (node) => card.id != node, 'Slot');
        }
      });
    
    
    // Deck Area.
    (arrayComponents
      .filter(component => component.type === 'player') as Simple<Player>[])
      .forEach(player => {
        // If Deck is not yet rendered...
        if(document.getElementById(player.deck.id) != null) {
          return;
        }

        const deckElement = document.createElement('div');
        deckElement.id = player.deck.id;

        deckElement.addEventListener('click', e => {
          this.handleInteraction(player.deck.id);
          e.stopPropagation();
        });
      });

    // Lanes.
    (arrayComponents
      .filter(component => component.type === 'lane') as Simple<Lane>[])
      .forEach((lane, i) => {
        // Render single Lane.
        let laneElement = document.getElementById(lane.id);
        if(laneElement == null) {
          const cssClass = `lane lane-${i} lane-${lane.orientation}`;

          laneElement = document.createElement('div');
          laneElement.classList.add(...cssClass.split(' '));
          laneElement.id = lane.id;
          laneElement.addEventListener('click', e => {
            this.handleInteraction(lane.id);
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
        const player1Power = lane.cards.filter(card => card.owner.index === 0).map(card => card.power).reduce((prev, curr) => prev + curr ,0);
        const player2Power = lane.cards.filter(card => card.owner.index === 0).map(card => card.power).reduce((prev, curr) => prev + curr ,0);

        const powerDisparity = player1Power - player2Power;
        powerIndicator.innerHTML = `<span class="${powerDisparity == 0 ? 'neutral' : powerDisparity > 0 ? `player1` : 'player2'}">${Math.abs(powerDisparity)}</span>`;
      });

      
    // Render Stats.
    const turnId = turn.id;
    let endTurnElement = document.getElementById(turnId) as HTMLButtonElement;
    if(endTurnElement == null) {
      endTurnElement = document.createElement('button');
      endTurnElement.id = turnId;
      endTurnElement.type = 'button';
      endTurnElement.textContent = 'Pass Turn';
      endTurnElement.classList.add('end-turn-button');

      endTurnElement.addEventListener('click', e => {
          this.handleInteraction(turnId);
          e.stopPropagation();
      });
      
      gameStatElement.appendChild(endTurnElement);
    }

    players.forEach(player => {
      const playerArea = document.getElementById(`player${player.index + 1}-area`)!;
      const deckArea = document.getElementById(`deck-area-player${player.index + 1}`)!;

      // Render Crystal Zones
      const crystalzoneId = player.crystalzone.id;

      let crystalzoneElement = document.getElementById(crystalzoneId);
      if(crystalzoneElement == null) {
        crystalzoneElement = document.createElement('div');
        crystalzoneElement.id = crystalzoneId;
        crystalzoneElement.classList.add('crystalzone', `player${player.index + 1}-crystalzone`);

        crystalzoneElement.addEventListener('click', e => {
          this.handleInteraction(crystalzoneId);
          e.stopPropagation();
        });
        
        playerArea.appendChild(crystalzoneElement);
      }

      // Clean up dangling DOM nodes of cards that are no longer in this zone.
      this.removeDanglingNodes(crystalzoneElement, (nodeId) => !player.crystalzone.cards.filter(card => card.id === nodeId) === undefined, 'Crystal Zone');

      // Render cards in crystal zone.
      player.crystalzone.cards.forEach(card => {            
        let cardElement = crystalzoneElement.querySelector(`[id="${card.id}"]`);

        if(cardElement == null) {
          crystalzoneElement.appendChild(this.createCardElement(card, player.index, true));
        }
      });

      // Hand.
      const handId = player.hand.id;
      let handElement = document.getElementById(handId);
      if(handElement == null) {
        handElement = document.createElement('div');
        handElement.id = handId;
        handElement.classList.add('hand', `player${player.index + 1}-hand`);
  
        playerArea.appendChild(handElement);
      }

      // Remove no longer referenced nodes in the DOM, if the model doesn't hold the card anymore.
      this.removeDanglingNodes(handElement, (nodeId) => !player.hand.cards.filter(card => card.id === nodeId) === undefined, 'Hand');

      // Cards in Hand.
      player.hand.cards.forEach(card => {
        let cardElement = document.getElementById(card.id);
        
        if(cardElement == null) {
          handElement.appendChild(this.createCardElement(card, player.index));
        }
      });

      // Deck
      const deckId = player.deck.id;
      if(document.getElementById(deckId) == null) {
        const deckElement = document.createElement('div');
        deckElement.classList.add('deck');
        deckElement.id = deckId;
        deckElement.addEventListener('click', e => {
            this.handleInteraction(deckId);
            e.stopPropagation();
        });

        deckArea.appendChild(deckElement);
      }
      
      // Deck Count - render once, update always.
      const deckCounterId = `counter-player${player.index + 1}`;
      let deckCounterElement = document.getElementById(deckCounterId);
      if(deckCounterElement == null) {
          deckCounterElement = document.createElement('div');
          deckCounterElement.classList.add('deck-count');
          deckCounterElement.id = deckCounterId;

          deckArea.appendChild(deckCounterElement);
      }
      // Always update this value!
      deckCounterElement.textContent = '' + player.deck.cards.length;

      // Stats per Player
      const statElementId = `player${player.index + 1}-stats`;
      let statElement = document.getElementById(statElementId);

      if(statElement == null) {
        statElement = document.createElement('div');
        statElement.id = statElementId;
        statElement.classList.add(`player${player.index + 1}`);
        
        gameStatElement.appendChild(statElement);
      }

      statElement.textContent = `Won Lanes: ${player.wonLanes.length}`;
    });
  };

  /*
  private highlight = (choices: Choice[], alreadySeenContext = new Set(), initialInteraction = false) => {
    // Remove highlights so far...
    (Array.from(document.querySelectorAll('.highlight').values()) as HTMLElement[]).forEach(element => {
      element.classList.remove('highlight');

      const oldBorderColor = element.style['OLD_COLOR'];

      if(oldBorderColor !== undefined) {
        element.style.borderColor = oldBorderColor;
      }
    });

    choices.forEach(choice => {
      const componentsToHighlight = [...choice.arguments
        .flat()
        // Filter out duplicate entries.
        .reduce((prev, current) => {
            if(prev.has(current)) {
                prev.set(current, undefined);
                return prev;
            }

            prev.set(current, 'yay');
            return prev;
        }, new Map())
        .entries()]
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => key)
        // Highlight all remaining elements.
        .filter(id => !alreadySeenContext.has(id))
        .filter(id => {
          // If the user already entered context through the UI, keep it!
          if(!initialInteraction) {
            return true;
          }

          // Otherwise, discard all component highlights that are not "Card" or "Pass"
          const types = this.components.get(id)!.types;
          return types.indexOf('turn') >= 0 || types.indexOf('card') >= 0;
        });

      componentsToHighlight
        .forEach(id => {
          const element = document.getElementById(id)!;
          element.classList.add('highlight');

          // Hack: Save original color in var!
          if(element.style['OLD_COLOR'] === undefined) {
            element.style['OLD_COLOR'] = element.style.borderColor;
          }

          const newColor = ACTION_COLORS[choice.actionType];
          if(newColor !== undefined) {
            element.style.borderColor = newColor;
          }
        });
    });
  } */
};