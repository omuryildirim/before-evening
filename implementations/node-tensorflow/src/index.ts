import * as fs from 'fs';
import path from "path";

import * as tf from '@tensorflow/tfjs';

import {BeforeEvening, StateUpdate} from '../../../src';
import {
  ActionKeyEventMapper,
  ActionKeyToEventName
} from '../../shared/action-key-event-mapper';
import {Memory} from '../../shared/memory';
import {MODEL_VERSION} from "../../shared/constants";
import {SaveablePolicyNetwork} from '../../shared/policy-network';
import {ReinforcementLearningModel} from '../../shared/reinforcement-learning.model';

import {MODEL_SAVE_PATH} from "./constants";


const MIN_EPSILON = 0.5;
const MAX_EPSILON = 0.8;
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
  private dataset: { state: [number, number, number, number, number, number, number]; action: { key: number; value: string; }; selectedAction: {key: number; value: string; epsilon: number;}; relativeReward: number; reward: number; }[];
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
    if (fs.existsSync(path.resolve('../shared/' + MODEL_VERSION + '/model.json'))) {
      const maxStepsPerGame = Number.parseInt(this.maxStepsPerGame);
      this.policyNet = await SaveablePolicyNetwork.loadModel(maxStepsPerGame, MODEL_SAVE_PATH);
      this.hiddenLayerSize = this.policyNet.hiddenLayerSizes();
    } else {
      this.createModel();
    }

    this.beforeEvening = new BeforeEvening();

    await this.train();
  };

  public async createModel() {
    console.log(`Creating a new model...`);
    const hiddenLayerSizes = Number.parseInt(this.hiddenLayerSize);
    const maxStepsPerGame = Number.parseInt(this.maxStepsPerGame);
    this.policyNet = new SaveablePolicyNetwork({hiddenLayerSizesOrModel: hiddenLayerSizes, maxStepsPerGame, modelName: MODEL_SAVE_PATH});
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
      let previousReward = ReinforcementLearningModel.computeReward(rawState.playerX, rawState.speed);
      while (remainingSteps) {
        // Exponentially decay the exploration parameter
        const epsilon = MIN_EPSILON + (MAX_EPSILON - MIN_EPSILON) * Math.exp(-LAMBDA * currentStep);
        const actionMap = this.takeAction(state, remainingSteps, previousAction, epsilon);

        const action = actionMap.action;
        remainingSteps = actionMap.remainingSteps;

        // simulate new action
        rawState = this.beforeEvening.simulateState();

        const nextState = ReinforcementLearningModel.getState(rawState);
        const reward = ReinforcementLearningModel.computeReward(rawState.playerX, rawState.speed);

        const relativeReward = ReinforcementLearningModel.computeRelativeReward({reward, previousReward, x: rawState.playerX, speed: rawState.speed})

        // add sample to memory
        // important: action is between -1 and 6. But for the model it's between 0 and 7.
        // so we need to add 1 to selected action before feed it to network
        memory.addSample([state, action + 1, relativeReward, nextState]);

        // Log state to dataset
        this.createNewDatasetPoint(rawState, epsilon, actionMap.action, relativeReward, reward);

        currentStep += 1;

        state = nextState;
        totalReward += relativeReward;

        previousAction = action;
        previousReward = reward;
      }

      await this.policyNet.educateTheNet(memory, discountRate);
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

  private createNewDatasetPoint(state: StateUpdate, epsilon: number, action: number, relativeReward: number, reward: number) {
    let bestReward = -100000000000;
    let bestAction: number;

    for (const action of [-1, 0, 1, 2, 3, 4, 5, 6]) {
      const rawState = this.beforeEvening.testAction(ActionKeyEventMapper.convertActionToKeyboardKeyNumber(action));
      const reward = ReinforcementLearningModel.computeReward(rawState.playerX, rawState.speed);

      if (reward > bestReward) {
        bestReward = reward;
        bestAction = action;
      }

      // console.log("-----------------------------");
      // console.log(state, rawState, reward, action);
    }

    this.dataset.push({
      state: [state.playerX, ...state.next5Curve, state.speed] as never,
      action: {key: bestAction, value: ActionKeyToEventName[bestAction]},
      selectedAction: {key: action, value: ActionKeyToEventName[action], epsilon},
      relativeReward,
      reward
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

    return `Total time: ${hours} hours ${(minutes - hours*60).toFixed()} minutes ${seconds.toFixed()} seconds`;
  }
}

new NodeTensorflow();
