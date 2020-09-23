import {ReinforcementLearningModel} from './reinforcement-learning.model';
import {Memory} from './memory';

import * as tf from '@tensorflow/tfjs';
import {GameStateService} from "../../game-state.service";
import {ActionMap} from "../reinforcement-learning.types";
import {takeUntil} from "rxjs/operators";

const MIN_EPSILON = 0.01;
const MAX_EPSILON = 0.2;
const LAMBDA = 0.01;

export class Orchestrator {
  private model: ReinforcementLearningModel;
  private memory: Memory;
  private eps: number;
  private steps: number;
  private maxStepsPerGame: number;
  private discountRate: number;
  private rewardStore: number[];
  maxPositionStore: number[];
  private gameStateService: GameStateService;
  private remainingSteps: number;

  /**
   * @param {ReinforcementLearningModel} model
   * @param {Memory} memory
   * @param {number} discountRate
   * @param {number} maxStepsPerGame
   * @param gameStateService
   */
  constructor(model: ReinforcementLearningModel, memory: Memory, discountRate: number, maxStepsPerGame: number,
              gameStateService: GameStateService) {
    this.gameStateService = gameStateService;
    // The main components of the environment
    this.model = model;
    this.memory = memory;

    // The exploration parameter
    this.eps = MAX_EPSILON;

    // Keep tracking of the elapsed steps
    this.steps = 0;
    this.maxStepsPerGame = maxStepsPerGame;

    this.discountRate = discountRate;

    // Initialization of the rewards and max positions containers
    this.rewardStore = [];
    this.maxPositionStore = [];
  }

  /**
   * @param position: Position of vehicle inside the road. Road is between -1 and 1.
   * @param speed: Percentage of current speed to max speed.
   * @returns {number} Reward corresponding to the position
   */
  computeReward(position, speed) {
    let reward = 0;
    if (position < -1 || position > 1) {
      reward = -10 + (-40 * (Math.abs(position) - 1));
    } else {
      reward = 100 - (90 * Math.abs(position));
    }

    reward -= 100 * (1 - speed);
    console.log(reward);
    return reward;
  }

  async run() {
    let totalReward = 0;
    let maxPosition = -100;

    let state = ReinforcementLearningModel.getState({playerX: 0, next5Curve: [0, 0, 0, 0, 0], speed: 0});
    let {action, remainingSteps} = this.takeAction(state, this.maxStepsPerGame);

    let isFinished = (resolve) => {
      const subscription = this.gameStateService.stateUpdater.subscribe(async rawState => {
        if (remainingSteps) {
          let nextState = ReinforcementLearningModel.getState(rawState);
          const reward = this.computeReward(rawState.playerX, rawState.speed);

          // Keep the car on max position if reached
          this.memory.addSample([state, action, reward, nextState]);

          this.steps += 1;
          // Exponentially decay the exploration parameter
          this.eps = MIN_EPSILON + (MAX_EPSILON - MIN_EPSILON) * Math.exp(-LAMBDA * this.steps);

          state = nextState;
          totalReward += reward;

          let actionMap = this.takeAction(state, remainingSteps);
          action = actionMap.action;
          remainingSteps = actionMap.remainingSteps;
        } else {
          this.rewardStore.push(totalReward);
          subscription.unsubscribe();
          await this.replay();
          // this.maxPositionStore.push(maxPosition);
          resolve();
        }
      });
    };

    return new Promise(isFinished);
  }

  takeAction(state: tf.Tensor2D, remainingSteps: number) {
    const action = this.model.chooseAction(state, this.eps);
    this.gameStateService.dispatchAnAction(ActionMap[action]);

    return {action: action, remainingSteps: remainingSteps - 1};
  }

  async replay() {
    // Sample from memory
    const batch = this.memory.sample(this.model.batchSize);
    const states = batch.map(([state, , ,]) => state);
    const nextStates = batch.map(
      ([, , , nextState]) => nextState ? nextState : tf.zeros([this.model.numStates])
    );

    // Predict the values of each action at each state
    const qsa = states.map((state) => this.model.predict(state));
    // Predict the values of each action at each next state
    const qsad = nextStates.map((nextState) => this.model.predict(nextState));

    let x: any = [];
    let y: any = [];

    // Update the states rewards with the discounted next states rewards
    batch.forEach(
      ([state, action, reward, nextState], index) => {
        if (qsa[index]) {
          const currentQ = qsa[index];
          currentQ[action] = nextState ? reward + this.discountRate * qsad[index].max().dataSync() : reward;
          x.push(state.dataSync());
          y.push(currentQ.dataSync());
        } else {
          qsa.splice(index, 1);
          qsad.splice(index, 1);
        }
      }
    );

    // Clean unused tensors
    qsa.forEach((state) => state.dispose());
    qsad.forEach((state) => state.dispose());

    // Reshape the batches to be fed to the network
    x = tf.tensor2d(x, [x.length, this.model.numStates]);
    y = tf.tensor2d(y, [y.length, this.model.numActions]);

    // Learn the Q(s, a) values given associated discounted rewards
    await this.model.train(x, y);

    x.dispose();
    y.dispose();
  }

  public test() {
    this.gameStateService.refreshGame.next();
    this.gameStateService.stateUpdater.pipe(takeUntil(this.gameStateService.stopTest))
      .subscribe(rawState => {
        const state = ReinforcementLearningModel.getState(rawState);
        this.takeAction(state, 0);
      });
  }
}
