import * as tf from '@tensorflow/tfjs';

import { convertActionToKeyboardKeyNumber, Memory , SaveablePolicyNetwork, ReinforcementLearningModel } from '@before-evening/shared';
import GameStateService from '../GameStateService';
import { ActionMap } from './constants';

export class Orchestrator {
  private policyNetwork: SaveablePolicyNetwork;
  private readonly memory: Memory;
  private eps: number;
  private readonly minEpsilon: number;
  private readonly maxEpsilon: number;
  private readonly lambda: number;
  private readonly learningRate: number;
  private steps: number;
  private readonly maxStepsPerGame: number;
  private readonly discountRate: number;
  private rewardStore: number[];
  maxPositionStore: number[];
  private gameStateService: GameStateService;
  private readonly setTrainingInProgressText: (text: string) => void;

  public totalActions = 0;
  public totalCorrectActions = 0;

  /**
   * @param {SaveablePolicyNetwork} policyNetwork
   * @param {Memory} memory
   * @param {number} discountRate
   * @param learningRate
   * @param {number} maxStepsPerGame
   * @param {number} gameStateService
   * @param {number} maxEpsilon
   * @param {number} minEpsilon
   * @param lambda
   * @param setTrainingInProgressText
   */
  constructor(
    policyNetwork: SaveablePolicyNetwork,
    memory: Memory,
    discountRate: number,
    learningRate: number,
    maxStepsPerGame: number,
    gameStateService: GameStateService,
    maxEpsilon: number,
    minEpsilon: number,
    lambda: number,
    setTrainingInProgressText: (text: string) => void
  ) {
    this.gameStateService = gameStateService;
    // The main components of the environment
    this.policyNetwork = policyNetwork;
    this.memory = memory;

    // The exploration parameter
    this.eps = maxEpsilon;
    this.minEpsilon = minEpsilon;
    this.maxEpsilon = maxEpsilon;
    this.lambda = lambda;

    // Keep tracking of the elapsed steps
    this.steps = 0;
    this.maxStepsPerGame = maxStepsPerGame;

    this.discountRate = discountRate;
    this.learningRate = learningRate;

    // Initialization of the rewards and max positions containers
    this.rewardStore = [];
    this.maxPositionStore = [];

    this.setTrainingInProgressText = setTrainingInProgressText;
  }

  async run() {
    let totalReward = 0;
    let state = ReinforcementLearningModel.getState({
      playerX: 0,
      next5Curve: [0, 0, 0, 0, 0],
      speed: 0,
    });
    let { action, remainingSteps } = this.takeAction(
      state as any,
      this.maxStepsPerGame
    );

    const isFinished = (resolve: (value?: unknown) => void) => {
      const id = this.gameStateService.addStateUpdater(
        async (rawState) => {
          if (remainingSteps) {
            const nextState = ReinforcementLearningModel.getState(rawState);
            const reward = ReinforcementLearningModel.computeReward(
              rawState.playerX,
              rawState.speed
            );

            // Keep the car on max position if reached
            this.memory.addSample([state, action, reward, nextState]);

            this.steps += 1;
            // Exponentially decay the exploration parameter
            this.eps =
              this.minEpsilon +
              (this.maxEpsilon - this.minEpsilon) *
                Math.exp(-this.lambda * this.steps);

            state = nextState;
            totalReward += reward;

            const actionMap = this.takeAction(state as any, remainingSteps);
            action = actionMap.action;
            remainingSteps = actionMap.remainingSteps;
          } else {
            this.rewardStore.push(totalReward);
            this.gameStateService.removeStateUpdater(id);
            await this.policyNetwork.educateTheNet(
              this.memory,
              this.discountRate,
              this.learningRate
            );
            // this.maxPositionStore.push(maxPosition);
            resolve();
          }
        }
      );
    };

    return new Promise(isFinished);
  }

  takeAction(state: tf.Tensor2D, remainingSteps: number) {
    const action = this.policyNetwork.model.chooseAction(
      state as any,
      this.eps
    );
    this.gameStateService.dispatchAnAction(ActionMap[action]);

    return { action: action, remainingSteps: remainingSteps - 1 };
  }

  takePredictedAction(state: tf.Tensor2D) {
    const action = this.policyNetwork.model.predictAction(state as any);
    let bestAction: number = 0;
    let bestReward = -10000000000;

    for (const testAction of [-1, 0, 1, 2, 3, 4, 5]) {
      const rawState = this.gameStateService.beforeEvening.testAction(
        convertActionToKeyboardKeyNumber(testAction)
      );
      const reward = ReinforcementLearningModel.computeReward(
        rawState.playerX,
        rawState.speed
      );

      if (reward > bestReward) {
        bestReward = reward;
        bestAction = testAction;
      }
    }

    this.totalActions += 1;
    this.totalCorrectActions += action === bestAction ? 1 : 0;
    this.setTrainingInProgressText(
      '%' + (this.totalCorrectActions * 100) / this.totalActions);

    this.gameStateService.dispatchAnAction(ActionMap[action]);
  }

  public test() {
    this.gameStateService.refreshGame();
    this.gameStateService.addStateUpdater((rawState) => {
      const state = ReinforcementLearningModel.getState(rawState);
      this.takePredictedAction(state as any);
    });
  }
}
