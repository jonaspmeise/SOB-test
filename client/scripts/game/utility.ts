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