import * as fs from 'fs';
import path from "path";

import * as tf from '@tensorflow/tfjs';

import {BeforeEvening, StateUpdate} from '../../../src';
import {
  ActionKeyEventMapper,
  ActionKeyToEventName
} from '../../shared/action-key-event-mapper';
import {MODEL_VERSION} from "../../shared/constants";
import {Memory} from '../../shared/memory';
import {SaveableNodePolicyNetwork} from '../../shared/policy-network.node';
import {ReinforcementLearningModel} from '../../shared/reinforcement-learning.model';

import {MODEL_SAVE_PATH} from "./constants";


const MIN_EPSILON = 0.5;
const MAX_EPSILON = 0.8;
const LAMBDA = 0.01;

class NodeTensorflow {
  private policyNet: SaveableNodePolicyNetwork;
  private hiddenLayerSize: number;
  private readonly numberOfIterations: string;
  private readonly gamesPerIteration: number;
  private readonly maxStepsPerGame: number;
  private readonly discountRate: number;
  private iterationStatus: string;
  private gameStatus: string;
  private beforeEvening: BeforeEvening;
  private dataset: { state: [number, number, number, number, number, number, number]; action: { key: number; value: string; }; selectedAction: {key: number; value: string; epsilon: number;}; relativeReward: number; reward: number; }[];
  private startTime: Date;

  constructor() {
    this.hiddenLayerSize = 1024;
    this.numberOfIterations = '50';
    this.gamesPerIteration = 100;
    this.maxStepsPerGame = 1000;
    this.discountRate = 0.95;
    this.iterationStatus = '';
    this.gameStatus = '';
    this.dataset = [];
    this.startTime = new Date();

    this.initialize();
  }

  private async initialize() {
    if (fs.existsSync(path.resolve('../shared/' + MODEL_VERSION + '/model.json'))) {
      this.policyNet = await SaveableNodePolicyNetwork.loadModel(this.maxStepsPerGame, MODEL_SAVE_PATH);
      this.hiddenLayerSize = this.policyNet.hiddenLayerSizes();
    } else {
      this.createModel();
    }

    this.beforeEvening = new BeforeEvening();

    await this.train();
  };

  private async createModel() {
    console.log(`Creating a new model...`);
    this.policyNet = new SaveableNodePolicyNetwork({hiddenLayerSizesOrModel: this.hiddenLayerSize, maxStepsPerGame: this.maxStepsPerGame, modelName: MODEL_SAVE_PATH});
  }

  private async train() {
    const trainIterations = Number.parseInt(this.numberOfIterations);
    if (!(trainIterations > 0)) {
      throw new Error(`Invalid number of iterations: ${trainIterations}`);
    }

    if (!(this.gamesPerIteration > 0)) {
      throw new Error(
        `Invalid # of games per iterations: ${this.gamesPerIteration}`);
    }

    if (!(this.maxStepsPerGame > 1)) {
      throw new Error(`Invalid max. steps per game: ${this.maxStepsPerGame}`);
    }

    if (!(this.discountRate > 0 && this.discountRate < 1)) {
      throw new Error(`Invalid discount rate: ${this.discountRate}`);
    }

    this.onIterationEnd(0, trainIterations);
    for (let iteration = 0; iteration < trainIterations; ++iteration) {
      await this.trainModelForNumberOfGames();
      this.onIterationEnd(iteration + 1, trainIterations);
      await this.policyNet.saveModel();
    }
  }

  private async trainModelForNumberOfGames() {
    this.onGameEnd(0, this.gamesPerIteration);
    const memory = new Memory(this.maxStepsPerGame);

    for (let i = 0; i < this.gamesPerIteration; ++i) {
      // Randomly initialize the state of the system at the beginning
      // of every game.
      this.beforeEvening.resetGame(true);
      await this.runOneEpisode(this.discountRate, this.maxStepsPerGame, memory);
      this.onGameEnd(i + 1,this.gamesPerIteration);
    }

    this.writeLogToFile();
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

    console.log('\n', '--------------------------------------------------', '\n',
      this.iterationStatus, '\n');
  }

  private onGameEnd(gameCount: number, totalGames: number) {
    this.gameStatus = `Game ${gameCount} of ${totalGames}`;

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
