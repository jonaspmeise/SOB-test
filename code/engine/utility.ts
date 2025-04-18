import { PlayerInterface, Simple } from "./types-engine.js";

/*
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
*/

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

export const prepareForExport = <T extends {toJSON: () => unknown}> (object: T | Map<string, T>): Simple<T> => {
    return (object as T).toJSON() as Simple<T>;
};

export const prepareMapForExport = <T extends {toJSON: () => unknown}> (map: Map<string, T>, jsonFunc: (value: T) => Simple<T>): Map<string, Simple<T>> => {
    const newMap: Map<string, Simple<T>> = new Map();
    
    Array.from(map.entries()).forEach(([key, value]) => {
        newMap.set(key, jsonFunc(value) as Simple<T>);
    });

    return newMap;
};

export const jsonify = (obj: any): any => {
    console.debug('jsonifying... ');
  
    const json = {};
    for(let key in obj) {
      const target = obj[key];
      // Default case.
      if(typeof target === 'function') {
        // Ignore if its a built-in-function.
        if(key === 'toJSON' || key === 'toString') {
            continue;
        }

        // This might be a Query - so we simply access this once.

        json[key] = target();
        continue;
      }
  
      if(typeof target !== 'object') {
        json[key] = target;
        continue;
      }
      
      console.debug(Object.keys(obj));
      console.debug(target);
      console.debug(`Masking reference to other component in property "${key}" (${typeof target})...`);
      // Exclude references to other Entities!
      json[key] = `@${target.id}`;
    }
  
    return json;
};