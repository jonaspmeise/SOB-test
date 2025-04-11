import { Realm, RealmCount, RealmMapping } from "./types-game.js";

/*
export const getCombinations = (arrays: string[][]): RealmCount => {
  // Base case: if there's only one array, return its elements as combinations
  if (arrays.length === 1) {
    return arrays[0].map(item => ({ [item]: 1 }));
  }

  // Recursive case: combine the first array with the combinations of the rest
  const firstArray = arrays[0];
  const restCombinations = getCombinations(arrays.slice(1));
  const result: Combination[] = [];

  firstArray.forEach(item => {
      restCombinations.forEach(combination => {
          const newCombination = { ...combination };
          if (newCombination[item]) {
              newCombination[item]++;
          } else {
              newCombination[item] = 1;
          }
          result.push(newCombination);
      });
  });

  return result;
}
  */


export const jsonify = (obj: any): any => {
  console.debug('jsonifying... ');

  const json = {};
  for(let key in obj) {
    const target = obj[key];
    // Default case.
    // Functions are ignored.
    if(typeof target === 'function') {
      continue;
    }

    if(typeof target !== 'object') {
      json[key] = target;
      continue;
    }
    
    console.debug(Object.keys(obj));
    console.debug(`Masking reference to other component in property "${key}" (${typeof target})...`);
    // Exclude references to other Entities!
    json[key] = `@${target.id}`;
  }

  return json;
};