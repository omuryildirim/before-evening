import * as tf from '@tensorflow/tfjs';
import { takeUntil } from 'rxjs/operators';

import { convertActionToKeyboardKeyNumber, Memory , SaveablePolicyNetwork, ReinforcementLearningModel } from '@before-evening/shared';
import { GameStateService } from '../../game-state.service';
import { ActionMap } from '../reinforcement-learning.types';

export class Orchestrator {
  private policyNetwork: SaveablePolicyNetwork;
  private memory: Memory;
  private eps: number;
  private minEpsilon: number;
  private maxEpsilon: number;
  private lambda: number;
  private learningRate: number;
  private steps: number;
  private readonly maxStepsPerGame: number;
  private readonly discountRate: number;
  private rewardStore: number[];
  maxPositionStore: number[];
  private gameStateService: GameStateService;

  public totalActions = 0;
  public totalCorrectActions = 0;

  /**
   * @param {SaveablePolicyNetwork} policyNetwork
   * @param {Memory} memory
   * @param {number} discountRate
   * @param {number} maxStepsPerGame
   * @param {number} gameStateService
   * @param {number} maxEpsilon
   * @param {number} minEpsilon
   * @param lambda
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
    lambda: number
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

    const isFinished = (resolve) => {
      const subscription = this.gameStateService.stateUpdater.subscribe(
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
            subscription.unsubscribe();
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
    let bestAction: number;
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
    document.querySelector('.note').innerHTML =
      '%' + (this.totalCorrectActions * 100) / this.totalActions;

    this.gameStateService.dispatchAnAction(ActionMap[action]);
  }

  public test() {
    this.gameStateService.refreshGame.next();
    this.gameStateService.stateUpdater
      .pipe(takeUntil(this.gameStateService.stopTest))
      .subscribe((rawState) => {
        const state = ReinforcementLearningModel.getState(rawState);
        this.takePredictedAction(state as any);
      });
  }
}
