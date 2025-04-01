import { Player } from "./types-engine";
import { Card } from "../game/types-game";

const logElement = document.getElementById('log')!;
export const log = (text: string, player?: Player, fancy = false) => {
    const entry = document.createElement('div');
    entry.classList.add('log-entry');

    if(player !== undefined) {
        entry.classList.add(`player${player.index + 1}`);
    }
    if(fancy) {
        entry.classList.add('log-entry-fancy');
    }

    entry.innerHTML = text;

    if(logElement?.childNodes.length === 0) {
        logElement.appendChild(entry);
    } else {
        logElement.firstElementChild!.insertAdjacentHTML("beforebegin", entry.outerHTML);
    }
};


const preview = document.getElementById('card-preview')!;
export const showCardPreview = (card: Card) => {
    const url = getCardArtUrl(card);

    if(url == null) {
        console.error(`There is no artwork for Card ${card}!`);
        return;
    }

    preview.style.backgroundImage = url;
    preview.style.display = 'block';
};

export const hideCardPreview = () => {
    preview.style.display = 'none';
};

export const resolveCardArt = (name: string) => `https://cdn.shardsofbeyond.com/rashid-test/${name.toLowerCase().replace(/\W/g, '')}.png`;
export const getCardArtUrl = (card?: Card) => card === undefined ? null : `url('${resolveCardArt(card.name)}')`;
export const getRawCardArtUrl = (card?: Card) => card === undefined ? null : `url('https://cdn.shardsofbeyond.com/rashid-test-artworks/${card.artwork}')`;

export const shuffle = <T> (array: T[], seed?: number): T[] => {
    let currentIndex = array.length;

    while (currentIndex != 0) {
        // TODO: Make randomness seedable!
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
};
  