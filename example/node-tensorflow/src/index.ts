import * as tf from '@tensorflow/tfjs';
import {Subject} from "rxjs";

import {BeforeEvening} from "../../../build/main";

import {Memory} from "./memory";
import {SaveablePolicyNetwork} from "./policy-network";
import {
  ReinforcementLearningModel,
  StateUpdate
} from "./reinforcement-learning.model";


const MIN_EPSILON = 0.01;
const MAX_EPSILON = 0.2;
const LAMBDA = 0.01;

export type ActionList =
  "left"
  | "up"
  | "right"
  | "down"
  | "left-up"
  | "right-up"
  | "right-down"
  | "left-down";
export const KEY = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  A: 65,
  D: 68,
  S: 83,
  W: 87
};

export class GameStateService {
  public stateUpdater: Subject<StateUpdate>;
  public refreshGame: Subject<null>;
  private previousActions: number[];
  public stopTest: Subject<boolean>;

  constructor() {
    this.refreshGame = new Subject<null>();
    this.stopTest = new Subject<null>();
  }

  public associateStateUpdater(stateUpdater: any) {
    this.stateUpdater = stateUpdater;
  }

  public dispatchAnAction(action: ActionList) {
    const keyList: number[] = [];

    switch (action) {
      case "left":
        keyList.push(KEY.LEFT);
        break;
      case "up":
        keyList.push(KEY.UP);
        break;
      case "right":
        keyList.push(KEY.RIGHT);
        break;
      case "down":
        keyList.push(KEY.DOWN);
        break;
      case "left-up":
        keyList.push(KEY.LEFT, KEY.UP);
        break;
      case "right-up":
        keyList.push(KEY.RIGHT, KEY.UP);
        break;
      case "right-down":
        keyList.push(KEY.RIGHT, KEY.DOWN);
        break;
      case "left-down":
        keyList.push(KEY.LEFT, KEY.DOWN);
        break;
    }

    if (this.previousActions) {
      for (const key of this.previousActions) {
        document.dispatchEvent(new KeyboardEvent('keyup', {'keyCode': key} as any));
      }
    }

    for (const key of keyList) {
      document.dispatchEvent(new KeyboardEvent('keydown', {'keyCode': key} as any));
    }

    this.previousActions = keyList;
  }
}

class NodeTensorflow {
  private policyNet: SaveablePolicyNetwork;
  public hiddenLayerSize: string;
  public storedModelStatus: string;
  public trainButtonText: string;
  public numberOfIterations: string;
  public gamesPerIteration: string;
  public maxStepsPerGame: string;
  public discountRate: string;
  public iterationStatus: string;
  public iterationProgress: number;
  public maxAwardList: number[];
  public bestPositionText: string;
  public gameStatus: string;
  public gameProgress: number;
  public gameStateService: GameStateService;
  private beforeEvening: BeforeEvening;

  constructor() {
    this.hiddenLayerSize = "128";
    this.storedModelStatus = "N/A";
    this.numberOfIterations = "20";
    this.gamesPerIteration = "100";
    this.maxStepsPerGame = "3000";
    this.discountRate = "0.95";
    this.trainButtonText = 'Train';
    this.iterationStatus = "";
    this.iterationProgress = 0;
    this.gameStatus = "";
    this.gameProgress = 0;
    this.gameStateService = new GameStateService();

    this.initialize();
  }

  private async initialize() {
    if (await SaveablePolicyNetwork.checkStoredModelStatus() != null) {
      const maxStepsPerGame = Number.parseInt(this.maxStepsPerGame);
      this.policyNet = await SaveablePolicyNetwork.loadModel(this.gameStateService, maxStepsPerGame);
      this.hiddenLayerSize = this.policyNet.hiddenLayerSizes();
    } else {
      this.createModel();
    }

    this.beforeEvening = new BeforeEvening();

    await this.train();
  };


  public async createModel() {
    const hiddenLayerSizes: any = this.hiddenLayerSize.trim().split(',').map(v => {
      const num = Number.parseInt(v.trim());
      if (!(num > 0)) {
        throw new Error(
          `Invalid hidden layer sizes string: ` +
          `${this.hiddenLayerSize}`);
      }
      return num;
    });

    const maxStepsPerGame = Number.parseInt(this.maxStepsPerGame);
    this.policyNet = new SaveablePolicyNetwork(hiddenLayerSizes, maxStepsPerGame, this.gameStateService);
  }

  public async deleteStoredModel() {
    if (confirm(`Are you sure you want to delete the locally-stored model?`)) {
      await this.policyNet.removeModel();
      this.policyNet = null;
    }
  };

  public async train() {
    const trainIterations = Number.parseInt(this.numberOfIterations);
    if (!(trainIterations > 0)) {
      throw new Error(`Invalid number of iterations: ${trainIterations}`);
    }
    const gamesPerIteration = Number.parseInt(this.gamesPerIteration);
    if (!(gamesPerIteration > 0)) {
      throw new Error(
        `Invalid # of games per iterations: ${gamesPerIteration}`);
    }
    const maxStepsPerGame = Number.parseInt(this.maxStepsPerGame);
    if (!(maxStepsPerGame > 1)) {
      throw new Error(`Invalid max. steps per game: ${maxStepsPerGame}`);
    }
    const discountRate = Number.parseFloat(this.discountRate);
    if (!(discountRate > 0 && discountRate < 1)) {
      throw new Error(`Invalid discount rate: ${discountRate}`);
    }

    this.maxAwardList = [];
    this.onIterationEnd(0, trainIterations);
    for (let i = 0; i < trainIterations; ++i) {
      const maxAward = await this.trainModelForNumberOfGames(
        discountRate,
        gamesPerIteration,
        maxStepsPerGame
      );
      this.maxAwardList.push(maxAward);

      console.log(`Maximum award was ${maxAward}`);

      this.onIterationEnd(i + 1, trainIterations);
      await tf.nextFrame();  // Unblock UI thread.
      await this.policyNet.saveModel();
    }
  }

  private async trainModelForNumberOfGames(discountRate: number, numGames: number, maxStepsPerGame: number) {
    const maxAward: number[] = [];
    this.onGameEnd(0, numGames);
    const memory = new Memory(maxStepsPerGame);

    for (let i = 0; i < numGames; ++i) {
      // Randomly initialize the state of the cart-pole system at the beginning
      // of every game.
      this.beforeEvening.resetGame();
      const totalAward = await this.runOneEpisode(discountRate, maxStepsPerGame, memory);
      maxAward.push(totalAward);
      this.onGameEnd(i + 1, numGames);
    }

    return Math.max(...maxAward);
  }

  private async runOneEpisode(discountRate: number, maxStepsPerGame: number, memory: Memory): Promise<number> {
    let totalReward = 0;
    let previousAction: number = null;
    let remainingSteps = maxStepsPerGame;

    let rawState = this.beforeEvening.getState();
    let state = ReinforcementLearningModel.getState(rawState);

    let currentStep = 0;

    const isFinished = async (resolve) => {
      while (remainingSteps) {
        // Exponentially decay the exploration parameter
        const epsilon = MIN_EPSILON + (MAX_EPSILON - MIN_EPSILON) * Math.exp(-LAMBDA * currentStep);
        const actionMap = this.takeAction(state, remainingSteps, previousAction, epsilon);

        const action = actionMap.action;
        remainingSteps = actionMap.remainingSteps;

        // simulate new action
        rawState = this.beforeEvening.simulateState();

        const nextState = ReinforcementLearningModel.getState(rawState);
        const reward = NodeTensorflow.computeReward(rawState.playerX, rawState.speed);

        // Keep the car on max position if reached
        memory.addSample([state, action, reward, nextState]);

        currentStep += 1;

        state = nextState;
        totalReward += reward;

        previousAction = action;
      }

      await this.educateTheNet(memory, discountRate);
      resolve(totalReward);
    };

    return new Promise(isFinished);
  }

  private takeAction(state: tf.Tensor2D, remainingSteps: number, previousAction: number, epsilon = MAX_EPSILON) {
    const action = this.policyNet.model.chooseAction(state, epsilon);
    this.beforeEvening.changeDirectionAccordingToKey(action, 'down');

    if (previousAction) {
      this.beforeEvening.changeDirectionAccordingToKey(previousAction, 'up');
    }

    return {action: action, remainingSteps: remainingSteps - 1};
  }

  private static computeReward(position: number, speed: number) {
    let reward = 0;
    if (position < -1 || position > 1) {
      reward = -10 + (-40 * (Math.abs(position) - 1));
    } else {
      reward = 100 - (90 * Math.abs(position));
    }

    reward -= 100 * (1 - speed);

    return reward;
  }

  private async educateTheNet(memory: Memory, discountRate: number) {
    // Sample from memory
    const batch = memory.sample(this.policyNet.model.batchSize);
    const states = batch.map(([state, , ,]) => state);
    const nextStates = batch.map(
      ([, , , nextState]) => nextState ? nextState : tf.zeros([this.policyNet.model.numStates])
    );

    // Predict the values of each action at each state
    const qsa = states.map((state) => this.policyNet.model.predict(state));
    // Predict the values of each action at each next state
    const qsad = nextStates.map((nextState) => this.policyNet.model.predict(nextState));

    let x: any = [];
    let y: any = [];

    // Update the states rewards with the discounted next states rewards
    batch.forEach(
      ([state, action, reward, nextState], index) => {
        if (qsa[index]) {
          const currentQ = qsa[index];
          currentQ[action] = nextState ? reward + discountRate * qsad[index].max().dataSync() : reward;
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
    x = tf.tensor2d(x, [x.length, this.policyNet.model.numStates]);
    y = tf.tensor2d(y, [y.length, this.policyNet.model.numActions]);

    // Learn the Q(s, a) values given associated discounted rewards
    await this.policyNet.model.train(x, y);

    x.dispose();
    y.dispose();
  }

  private onIterationEnd(iterationCount: number, totalIterations: number) {
    this.iterationStatus = `Iteration ${iterationCount} of ${totalIterations}`;
    this.iterationProgress = iterationCount / totalIterations * 100;

    console.log('\n', '--------------------------------------------------', '\n',
      this.iterationStatus, '\n');
  }

  public onGameEnd(gameCount: number, totalGames: number) {
    this.gameStatus = `Game ${gameCount} of ${totalGames}`;
    this.gameProgress = gameCount / totalGames * 100;

    console.log('*********', '\n', this.gameStatus, '\n');

    if (gameCount === totalGames) {
      this.gameStatus = 'Updating weights...';
    }
  }
}

new NodeTensorflow();
