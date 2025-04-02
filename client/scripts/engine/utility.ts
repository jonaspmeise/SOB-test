import { Player } from "./types-engine";

const logElement = document.getElementById('log')!;
// TODO: This mixes Log logic (state) with UI (client)!
export const log = (text: string, player?: Player, client = false) => {
    const entry = document.createElement('div');
    entry.classList.add('log-entry');

    if(player !== undefined) {
        entry.classList.add(`player${player.index + 1}`);
    }
    if(client) {
        entry.classList.add('log-entry-client');
    }

    entry.innerHTML = text;

    if(logElement?.childNodes.length === 0) {
        logElement.appendChild(entry);
    } else {
        logElement.firstElementChild!.insertAdjacentHTML("beforebegin", entry.outerHTML);
    }
};

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
  
export const range = (number: number): number[] => {
    return [...Array(number).keys()];
};