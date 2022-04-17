import * as tf from '@tensorflow/tfjs';
import {BeforeEvening, StateUpdate} from '../../../src';

import {Memory} from './memory';
import {SaveablePolicyNetwork} from './policy-network';
import {ReinforcementLearningModel,} from './reinforcement-learning.model';
import {
  ActionKeyEventMapper,
  ActionKeyToEventName
} from './action-key-event-mapper';

import * as fs from 'fs';

const MIN_EPSILON = 0.01;
const MAX_EPSILON = 0.2;
const LAMBDA = 0.01;

class NodeTensorflow {
  private policyNet: SaveablePolicyNetwork;
  public hiddenLayerSize: string;
  public storedModelStatus: string;
  public numberOfIterations: string;
  public gamesPerIteration: string;
  public maxStepsPerGame: string;
  public discountRate: string;
  public iterationStatus: string;
  public iterationProgress: number;
  public maxAwardList: number[];
  public gameStatus: string;
  public gameProgress: number;
  private beforeEvening: BeforeEvening;
  private dataset: { state: [number, number, number, number, number, number, number]; action: { key: number; value: string; }; selectedAction: {key: number; value: string; epsilon: number;} }[];
  private startTime: Date;

  constructor() {
    this.hiddenLayerSize = '1024';
    this.storedModelStatus = 'N/A';
    this.numberOfIterations = '50';
    this.gamesPerIteration = '100';
    this.maxStepsPerGame = '1000';
    this.discountRate = '0.95';
    this.iterationStatus = '';
    this.iterationProgress = 0;
    this.gameStatus = '';
    this.gameProgress = 0;
    this.dataset = [];
    this.startTime = new Date();

    this.initialize();
  }

  private async initialize() {
    if (await SaveablePolicyNetwork.checkStoredModelStatus()) {
      const maxStepsPerGame = Number.parseInt(this.maxStepsPerGame);
      this.policyNet = await SaveablePolicyNetwork.loadModel(maxStepsPerGame);
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
    this.policyNet = new SaveablePolicyNetwork(hiddenLayerSizes, maxStepsPerGame);
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
    for (let iteration = 0; iteration < trainIterations; ++iteration) {
      const maxAward = await this.trainModelForNumberOfGames(
        discountRate,
        gamesPerIteration,
        maxStepsPerGame
      );
      this.maxAwardList.push(maxAward);

      console.log(`Maximum award was ${maxAward}`);

      this.onIterationEnd(iteration + 1, trainIterations);
      await this.policyNet.saveModel();
    }
  }

  private async trainModelForNumberOfGames(discountRate: number, numGames: number, maxStepsPerGame: number) {
    const maxAward: number[] = [];
    this.onGameEnd(0, numGames);
    const memory = new Memory(maxStepsPerGame);

    for (let i = 0; i < numGames; ++i) {
      // Randomly initialize the state of the system at the beginning
      // of every game.
      this.beforeEvening.resetGame(true);
      const totalAward = await this.runOneEpisode(discountRate, maxStepsPerGame, memory);
      maxAward.push(totalAward);
      this.onGameEnd(i + 1, numGames);
    }

    this.writeLogToFile();
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
      let previousReward = NodeTensorflow.computeReward(rawState.playerX, rawState.speed);
      while (remainingSteps) {
        // Exponentially decay the exploration parameter
        const epsilon = MIN_EPSILON + (MAX_EPSILON - MIN_EPSILON) * Math.exp(-LAMBDA * currentStep);
        const actionMap = this.takeAction(state, remainingSteps, previousAction, epsilon);

        // Log state to dataset
        this.createNewDatasetPoint(rawState, epsilon, actionMap.action);

        const action = actionMap.action;
        remainingSteps = actionMap.remainingSteps;

        // simulate new action
        rawState = this.beforeEvening.simulateState();

        const nextState = ReinforcementLearningModel.getState(rawState);
        const reward = NodeTensorflow.computeReward(rawState.playerX, rawState.speed);

        const relativeReward = NodeTensorflow.computeRelativeReward({reward, previousReward, x: rawState.playerX, speed: rawState.speed})

        // Keep the car on max position if reached
        memory.addSample([state, action, relativeReward, nextState]);

        currentStep += 1;

        state = nextState;
        totalReward += relativeReward;

        previousAction = action;
        previousReward = reward;
      }

      await this.educateTheNet(memory, discountRate);
      resolve(totalReward);
    };

    return new Promise(isFinished);
  }

  private takeAction(state: tf.Tensor2D, remainingSteps: number, previousAction: number, epsilon = MAX_EPSILON) {
    const action = this.policyNet.model.chooseAction(state, epsilon);

    if (previousAction) {
      ActionKeyEventMapper.convertActionToKeyboardKeyNumber(previousAction).forEach(eventKey => {
        this.beforeEvening.changeDirectionAccordingToKey(eventKey, 'up');
      });
    }

    ActionKeyEventMapper.convertActionToKeyboardKeyNumber(action).forEach(eventKey => {
      this.beforeEvening.changeDirectionAccordingToKey(eventKey, 'down');
    });

    return {action: action, remainingSteps: remainingSteps - 1};
  }

  private static computeReward(position: number, speed: number) {
    let reward;
    // position can be between -3:3
    // if position is not in range -1:1 that means car is out of bounds
    if (position < -1 || position > 1) {
      // max minus 50 reward if car is not in road
      reward = -10 + (-20 * (Math.abs(position) - 1));
    } else {
      // max 100 reward if car is inside the road
      // min 10 reward if car is inside the road
      reward = 100 - (90 * Math.abs(position));
    }

    // max minus 50 reward if speed is not max
    reward -= 50 * (1 - speed);

    return reward;
  }

  private static computeRelativeReward({reward, previousReward, x, speed}: {reward: number; previousReward: number; x: number; speed: number;}) {
    // relative reward is the evaluation of current state compared to previous state
    // in this way we hope to evaluate the action based on the change happened
    // rather than the current state's positivity.
    //
    // for example if car is in the middle of the road at max speed, if model picks
    // a left move, car will slow down and move from center. But because of the new state
    // is very near to the perfect position reward of state will close to max reward.
    // But in practice the action have a negative impact on car's movement.
    let relativeReward = reward - previousReward;

    // if relative reward is zero and car is not at the center of road or speed is not at max
    // then return min possible reward
    if (relativeReward === 0 && (x !== 0 || speed !== 1)) {
      return -100;
    }

    return relativeReward;
  }

  private async educateTheNet(memory: Memory, discountRate: number) {
    // Sample from memory
    const batch = memory.sample(this.policyNet.model.batchSize);
    const states = batch.map(([state, ,]) => state);
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

    console.log('*********', '\n', this.iterationStatus, '\n', this.gameStatus, '\n');
    console.log(this.getPassedTime())

    if (gameCount === totalGames) {
      this.gameStatus = 'Updating weights...';
    }
  }

  private createNewDatasetPoint(state: StateUpdate, epsilon: number, action: number) {
    let bestReward = -100000000000;
    let bestAction: number;

    // @ts-ignore
    for (const action of [-1, 0, 1, 2, 3, 4, 5, 6]) {
      const rawState = this.beforeEvening.testAction(ActionKeyEventMapper.convertActionToKeyboardKeyNumber(action));
      const reward = NodeTensorflow.computeReward(rawState.playerX, rawState.speed);

      if (reward > bestReward) {
        bestReward = reward;
        bestAction = action;
      }

      // console.log("-----------------------------");
      // console.log(state, rawState, reward, action);
    }

    this.dataset.push({
      state: [state.playerX, ...state.next5Curve, state.speed] as any,
      action: {key: bestAction, value: ActionKeyToEventName[bestAction]},
      selectedAction: {key: action, value: ActionKeyToEventName[action], epsilon}
    });
  }

  private writeLogToFile() {
    const logStream = fs.createWriteStream('dataset.txt', {flags: 'a'});
    this.dataset.forEach((action) => {
      logStream.write(JSON.stringify(action) + '\n');
    });
    logStream.end();

    this.dataset = [];
  }

  private getPassedTime() {
    const minutes = (new Date().getTime() - this.startTime.getTime()) / 1000 / 60;
    const hours = Math.floor(minutes / 60);
    const seconds = (((minutes * 100) % 100) / 100 ) * 60

    return `Total time: ${hours} hours ${minutes.toFixed()} minutes ${seconds.toFixed()} seconds`;
  }
}

new NodeTensorflow();
