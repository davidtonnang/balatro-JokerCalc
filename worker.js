'use strict';
importScripts('balatro-sim.js');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const choose = (array, k) => {
  if (k === 0) return [[]];
  
  return array.flatMap((item, index) => 
    choose(array.slice(index + 1), k - 1)
      .map(combination => [item, ...combination])
  );
};

const permutations = (inputArr) => {
  const results = [];
  
  const permute = (arr, memo = []) => {
    if (arr.length === 0) {
      results.push([...memo]);
      return;
    }
    
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      arr.splice(i, 1);
      permute(arr, [...memo, current]);
      arr.splice(i, 0, current);
    }
  };
  
  permute([...inputArr]);
  return results;
};

let taskID;
let workerID;
let thisHand;

let cards;
let jokers;

let optimizeCards;
let minimize;
let optimizeMode;

let bestHand;

// postMessage();
// sleep(ms);

function initialize(state) {
  try {
    if (!state) throw new Error('Invalid state provided');
    
    thisHand = new Hand({
      hands: state.hands,
      TheFlint: state.TheFlint,
      PlasmaDeck: state.PlasmaDeck,
      Observatory: state.Observatory
    });

    ({ taskID, cards, jokers, optimizeCards, minimize, optimizeMode, bestHand, workerID } = state);
  } catch (error) {
    postMessage(['error', error.message]);
  }
}

function run(jokers = [[]]) {
  thisHand.jokers = jokers[0].map(a => a.slice());

  thisHand.compileJokers();

  let bestJokers = [];
  let bestCards = [];
  let bestCardsInHand = [];
  let bestScore = false;

  let possibleHands = [[]];

  let thisPermutations;

  if(optimizeCards) {
    possibleHands = [[]];
    let arr = [];
    for(let l = 0; l < cards.length; l++) {
      arr.push(l);
    }
    for(let i = 1; i <= Math.min(5, arr.length); i++) {
      possibleHands.push(...choose(arr, i));
    }
    thisPermutations = [
      [[]],
      [[0]],
      [[0,1],[1,0]],
      permutations([0,1,2]),
      permutations([0,1,2,3]),
      permutations([0,1,2,3,4])
    ];
  }
  else {
    for(let i = 0; i < bestHand.length; i++) {
      bestCards.push(cards[bestHand[i]]);
      thisHand.cards.push(cards[bestHand[i]]);
    }
    thisHand.cardsInHand = cards.slice();
    for(let l = 0; l < thisHand.cards.length; l++) {
      thisHand.cardsInHand.splice(thisHand.cardsInHand.indexOf(thisHand.cards[l]), 1);
    }
    bestCardsInHand = thisHand.cardsInHand;
  }

  for(let j = 0; j < jokers.length; j++) {
    thisHand.jokers = jokers[j].map(a => a.slice());
    thisHand.compileJokerOrder();

    if(optimizeCards) {
      for(let i = 0; i < possibleHands.length; i++) {
        const tmpCards = cards.map(a => a.slice());
        thisHand.cards = [];
        thisHand.cardsInHand = tmpCards.slice();
        for(let j = 0; j < possibleHands[i].length; j++) {
          thisHand.cards.push(cards[possibleHands[i][j]]);
        }
        for(let j = possibleHands[i].length - 1; j >= 0; j--) {
          thisHand.cardsInHand.splice(possibleHands[i][j], 1);
        }

        const thisCardsInHand = thisHand.cardsInHand.slice();
        const thisCards = thisHand.cards.slice();
        const thisPerms = thisPermutations[thisHand.cards.length];

        thisHand.actualCardsInHand = thisCardsInHand.slice();
        thisHand.compileCards();

        for(let l = 0; l < thisPerms.length; l++) {
          thisHand.cards = [];
          for(let m = 0; m < thisPerms[l].length; m++) {
            thisHand.cards.push(thisCards[thisPerms[l][m]]);
          }
          thisHand.cardsInHand = thisCardsInHand.slice();

          let thisScore;

          switch (optimizeMode) {
            default:
              if(minimize) {
                thisScore = thisHand.simulateBestHand();
                if(!bestScore) {
                  bestScore = thisScore;
                  bestCards = thisHand.cards;
                  bestJokers = jokers[j];
                  bestCardsInHand = thisHand.cardsInHand;
                }
                if(thisScore[1] < bestScore[1] || (thisScore[1] === bestScore[1] && thisScore[0] < bestScore[0]) || (bestCards.length === 0 && thisHand.cards.length > 0)) {
                  bestScore = thisScore;
                  bestCards = thisHand.cards;
                  bestJokers = jokers[j];
                  bestCardsInHand = thisHand.cardsInHand;
                }
                else if(bestCards.length === 0 && thisHand.cards.length > 0) {
                  bestScore = thisScore;
                  bestCards = thisHand.cards;
                  bestJokers = jokers[j];
                  bestCardsInHand = thisHand.cardsInHand;
                }

              }
              else {
                thisScore = thisHand.simulateWorstHand();

                if(!bestScore) {
                  bestScore = thisScore;
                  bestCards = thisHand.cards;
                  bestJokers = jokers[j];
                  bestCardsInHand = thisHand.cardsInHand;
                }
                if(thisScore[1] > bestScore[1] || (thisScore[1] === bestScore[1] && thisScore[0] > bestScore[0]) || (bestCards.length === 0 && thisHand.cards.length > 0)) {
                  bestScore = thisScore;
                  bestCards = thisHand.cards;
                  bestJokers = jokers[j];
                  bestCardsInHand = thisHand.cardsInHand;
                }
              }
          }
        }
      }
    }
    else {
      thisHand.compileCards();

      let thisScore;

      switch (optimizeMode) {
        default:
          if(minimize) {
            thisScore = thisHand.simulateBestHand();
            if(!bestScore) {
              bestScore = thisScore;
              bestJokers = jokers[j];
            }
            if(thisScore[1] < bestScore[1] || (thisScore[1] === bestScore[1] && thisScore[0] < bestScore[0])) {
              bestScore = thisScore;
              bestJokers = jokers[j];
            }
          }
          else {
            thisScore = thisHand.simulateWorstHand();

            if(!bestScore) {
              bestScore = thisScore;
              bestJokers = jokers[j];
            }
            if(thisScore[1] > bestScore[1] || (thisScore[1] === bestScore[1] && thisScore[0] > bestScore[0])) {
              bestScore = thisScore;
              bestJokers = jokers[j];
            }
          }
      }
    }
  }

  thisHand.jokers = bestJokers.map(a => a.slice());
  thisHand.cards = bestCards.slice();
  thisHand.cardsInHand = bestCardsInHand.slice();

  thisHand.compileAll();

  const highestScore = thisHand.simulateBestHand();
  const lowestScore = thisHand.simulateWorstHand();
  const highestScoreScore = normalizeBig(highestScore);
  highestScore[0] = highestScoreScore[0];
  highestScore[1] = highestScoreScore[1];
  const lowestScoreScore = normalizeBig(lowestScore);
  lowestScore[0] = lowestScoreScore[0];
  lowestScore[1] = lowestScoreScore[1];

  let medianScore = highestScore;
  let meanScore = highestScore;

  if(highestScore[0] !== lowestScore[0] || highestScore[1] !== lowestScore[1]) {
    let runScores = [];
    meanScore = [1, 0];
    for(let i = 0; i < 10001; i++) {
      const thisScore = thisHand.simulateRandomHand();
      runScores.push(thisScore);
      meanScore = bigBigAdd(thisScore, meanScore);
    }
    meanScore = bigTimes(1 / 10001, meanScore);
    runScores = runScores.sort((a, b) => {
      if(a[1] > b[1] || (a[1] === b[1] && a[0] > b[0])) {
        return 1;
      }
      return -1;
    });

    medianScore = runScores[5000];
  }

  postMessage([taskID, bestScore, bestJokers, bestCards, bestCardsInHand, highestScore, lowestScore, thisHand.typeOfHand, normalizeBig(meanScore), normalizeBig(medianScore), workerID, thisHand.compiledValues]);
}

self.onmessage = async function(msg) {
  switch (msg.data[0]) {
    case "start":
      initialize(msg.data[1]);
      break;
    case "once":
      run([[]]);
      break;
    case "dontOptimizeJokers":
      run([jokers]);
      break;
    case "optimizeJokers":
      let permuted = permutations(jokers);
      run(permuted.slice(msg.data[1], msg.data[2]));
      break;
    default:
  }
}
