import * as tf from '@tensorflow/tfjs';

import { BeforeEveningGameEngine, StateUpdate } from '@before-evening/game-engine';

import { ActionKeyEventMapper, ActionKeyToEventName } from './action-key-event-mapper';
import { Memory } from './memory';
import { SaveablePolicyNetwork } from './policy-network';
import { ReinforcementLearningModel } from './reinforcement-learning.model';

const LAMBDA = 0.01;

type Params = {
  maxStepsPerGame: number;
  gamesPerIteration: number;
  discountRate: number;
  learningRate: number;
  beforeEvening: BeforeEveningGameEngine;
  onGameEnd: (iteration: number, totalIteration: number) => void;
  policyNet: SaveablePolicyNetwork;
  minEpsilon: number;
  maxEpsilon: number;
};

export const trainModelForNumberOfGames = async (params: Params) => {
  const { maxStepsPerGame, gamesPerIteration, beforeEvening, onGameEnd } = params;
  const memory = new Memory(maxStepsPerGame);
  const dataset: LogData[] = [];

  for (let i = 0; i < gamesPerIteration; ++i) {
    // Randomly initialize the state of the system at the beginning
    // of every game.
    beforeEvening.resetGame(true);
    await runOneEpisode({ ...params, memory, dataset });
    onGameEnd(i + 1, gamesPerIteration);
  }

  return dataset;
};

interface RunOneEpisodeTypes extends Params {
  memory: Memory;
  dataset: LogData[];
}

const runOneEpisode = async ({
  beforeEvening,
  policyNet,
  discountRate,
  learningRate,
  maxStepsPerGame,
  memory,
  minEpsilon,
  maxEpsilon,
  dataset,
}: RunOneEpisodeTypes): Promise<number> => {
  let totalReward = 0;
  let previousAction: number = null;
  let remainingSteps = maxStepsPerGame;

  let rawState = beforeEvening.getState();
  let state = ReinforcementLearningModel.getState(rawState);

  let currentStep = 0;

  const isFinished = async (resolve) => {
    let previousReward = ReinforcementLearningModel.computeReward(rawState.playerX, rawState.speed);
    while (remainingSteps) {
      // Exponentially decay the exploration parameter
      const epsilon = minEpsilon + (maxEpsilon - minEpsilon) * Math.exp(-LAMBDA * currentStep);
      const actionMap = takeAction({
        state,
        remainingSteps,
        previousAction,
        epsilon,
        beforeEvening,
        policyNet,
      });

      const action = actionMap.action;
      remainingSteps = actionMap.remainingSteps;

      // simulate new action
      rawState = beforeEvening.simulateState();

      const nextState = ReinforcementLearningModel.getState(rawState);
      const reward = ReinforcementLearningModel.computeReward(rawState.playerX, rawState.speed);

      const relativeReward = ReinforcementLearningModel.computeRelativeReward({
        reward,
        previousReward,
        x: rawState.playerX,
        speed: rawState.speed,
      });

      // add sample to memory
      // important: action is between -1 and 6. But for the model it's between 0 and 7.
      // so we need to add 1 to selected action before feed it to network
      memory.addSample([state, action + 1, relativeReward, nextState]);

      // Log state to dataset
      createNewDatasetPoint({
        state: rawState,
        epsilon,
        action: actionMap.action,
        relativeReward,
        reward,
        beforeEvening,
        dataset,
      });

      currentStep += 1;

      state = nextState;
      totalReward += relativeReward;

      previousAction = action;
      previousReward = reward;
    }

    await policyNet.educateTheNet(memory, discountRate, learningRate);
    resolve(totalReward);
  };

  return new Promise(isFinished);
};

type TakeActionParams = {
  state: tf.Tensor2D;
  remainingSteps: number;
  previousAction: number;
  epsilon: number;
  policyNet: SaveablePolicyNetwork;
  beforeEvening: BeforeEveningGameEngine;
};

const takeAction = ({
  state,
  remainingSteps,
  previousAction,
  epsilon,
  policyNet,
  beforeEvening,
}: TakeActionParams) => {
  const action = policyNet.model.chooseAction(state, epsilon);

  if (previousAction) {
    ActionKeyEventMapper.convertActionToKeyboardKeyNumber(previousAction).forEach((eventKey) => {
      beforeEvening.changeDirectionAccordingToKey(eventKey, 'up');
    });
  }

  ActionKeyEventMapper.convertActionToKeyboardKeyNumber(action).forEach((eventKey) => {
    beforeEvening.changeDirectionAccordingToKey(eventKey, 'down');
  });

  return { action: action, remainingSteps: remainingSteps - 1 };
};

export type LogData = {
  state: [number, number, number, number, number, number, number];
  action: { key: number; value: string };
  selectedAction: { key: number; value: string; epsilon: number };
  relativeReward: number;
  reward: number;
};

type CreateNewDatasetPointParams = {
  state: StateUpdate;
  epsilon: number;
  action: number;
  relativeReward: number;
  reward: number;
  beforeEvening: BeforeEveningGameEngine;
  dataset: LogData[];
};

const createNewDatasetPoint = ({
  state,
  epsilon,
  action,
  relativeReward,
  reward,
  beforeEvening,
  dataset,
}: CreateNewDatasetPointParams) => {
  let bestReward = -100000000000;
  let bestAction: number;

  for (const action of [-1, 0, 1, 2, 3, 4, 5, 6]) {
    const rawState = beforeEvening.testAction(
      ActionKeyEventMapper.convertActionToKeyboardKeyNumber(action)
    );
    const reward = ReinforcementLearningModel.computeReward(rawState.playerX, rawState.speed);

    if (reward > bestReward) {
      bestReward = reward;
      bestAction = action;
    }
  }

  dataset.push({
    state: [state.playerX, ...state.next5Curve, state.speed] as never,
    action: { key: bestAction, value: ActionKeyToEventName[bestAction] },
    selectedAction: { key: action, value: ActionKeyToEventName[action], epsilon },
    relativeReward,
    reward,
  });
};
