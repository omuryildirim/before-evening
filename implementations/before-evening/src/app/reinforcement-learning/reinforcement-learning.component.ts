import {AfterViewInit, Component, OnInit} from '@angular/core';
import * as tf from "@tensorflow/tfjs";

import {Memory} from "../../../../shared/memory";
import {SaveablePolicyNetwork} from "../../../../shared/policy-network";
import {trainModelForNumberOfGames} from "../../../../shared/trainer";
import {GameStateService} from "../game-state.service";

import {
  LOCAL_STORAGE_MODEL_PATH,
  localStorageModelName,
  MODEL_SAVE_PATH,
  preTrainedModelName
} from "./helpers/constants";
import {Orchestrator} from "./helpers/orchestrator";

@Component({
  selector: 'reinforcement-learning',
  templateUrl: './reinforcement-learning.component.html',
  styleUrls: ['./reinforcement-learning.component.scss']
})
export class ReinforcementLearningComponent implements OnInit, AfterViewInit {
  private policyNet: SaveablePolicyNetwork;
  public hiddenLayerSize: number;
  public maxStepsPerGame: number;
  public gamesPerIteration: number;
  public discountRate: number;
  public numberOfIterations: string;
  public minEpsilon: number;
  public maxEpsilon: number;
  public lambda: number;
  public storedModelStatus: string;
  public disabledStatus = {
    deleteStoredModelButton: true,
    createModelButton: false,
    hiddenLayerSizesInput: false,
    trainButton: true,
    testButton: true
  };
  public trainButtonText: string;
  private stopRequested: boolean;
  public iterationStatus: string;
  public iterationProgress: number;
  public gameStatus: string;
  public gameProgress: number;
  public renderDuringTraining: boolean;
  public modelNames: { key: string; value: string; }[];
  private testState: boolean;
  private localStorageModel: boolean;
  private _modelSavePath: string;

  /**
   * Initializer.
   * @param gameStateService
   */
  constructor(private gameStateService: GameStateService) {
  }

  ngOnInit() {
    this.hiddenLayerSize = 1024;
    this.storedModelStatus = "N/A";
    this.numberOfIterations = "50";
    this.gamesPerIteration = 100;
    this.maxStepsPerGame = 3000;
    this.discountRate = 0.95;
    this.minEpsilon = 0.5;
    this.maxEpsilon = 0.8;
    this.lambda = 0.01;
    this.trainButtonText = 'Train';
    this.iterationStatus = "";
    this.iterationProgress = 0;
    this.gameStatus = "";
    this.gameProgress = 0;
    this.localStorageModel = false;
    this.renderDuringTraining = true;
    this.modelNames = [{key: MODEL_SAVE_PATH, value: preTrainedModelName}];
  }

  ngAfterViewInit() {
    this.initializeView();
  }

  private async initializeView() {
    const localStorageModelExists = await SaveablePolicyNetwork.checkStoredModelStatus(LOCAL_STORAGE_MODEL_PATH);
    if (localStorageModelExists) {
      this.modelNames.push({key: LOCAL_STORAGE_MODEL_PATH, value: localStorageModelName});
      this.localStorageModel = true;
    }

    this.modelSavePath = localStorageModelExists ? LOCAL_STORAGE_MODEL_PATH : MODEL_SAVE_PATH;
  };

  get modelSavePath() {
    return this._modelSavePath;
  }

  set modelSavePath(name) {
    this._modelSavePath = name;
    this.loadModel().then();
  }

  private async loadModel() {
    this.policyNet = await SaveablePolicyNetwork.loadModel(this.maxStepsPerGame, this.modelSavePath, true);
    this.hiddenLayerSize = this.policyNet.hiddenLayerSizes();
    await this.updateUIControlState();
  }

  public async createModel() {
    try {
      this._modelSavePath = LOCAL_STORAGE_MODEL_PATH;
      this.policyNet = new SaveablePolicyNetwork({hiddenLayerSizesOrModel: this.hiddenLayerSize, maxStepsPerGame: this.maxStepsPerGame, modelName: this.modelSavePath});
      await this.policyNet.saveModel();

      await this.updateUIControlState();
      this.modelNames.push({key: LOCAL_STORAGE_MODEL_PATH, value: localStorageModelName});
    } catch (err) {
      // logStatus(`ERROR: ${err.message}`);
    }
  }

  private async updateUIControlState() {
    if (this.policyNet == null) {
      this.storedModelStatus = 'No stored model.';
      this.disabledStatus.deleteStoredModelButton = true;
    } else {
      this.localStorageModel = this.modelSavePath !== MODEL_SAVE_PATH
      this.storedModelStatus = this.localStorageModel ? localStorageModelName: preTrainedModelName;
      this.disabledStatus.deleteStoredModelButton = !this.localStorageModel;
    }
    this.disabledStatus.createModelButton = this.localStorageModel;
    this.disabledStatus.hiddenLayerSizesInput = this.policyNet != null;
    this.disabledStatus.trainButton = this.policyNet == null || !this.localStorageModel;
    this.disabledStatus.testButton = this.policyNet == null;
  }

  public async deleteStoredModel() {
    if (confirm(`Are you sure you want to delete the locally-stored model?`)) {
      await this.policyNet.removeModel();
      this.policyNet = null;
      this.modelNames.pop();
      this.modelSavePath = MODEL_SAVE_PATH;
      await this.updateUIControlState();
    }
  };

  public async train() {
    if (this.trainButtonText === 'Stop') {
      this.stopRequested = true;
    } else {
      this.disableModelControls();

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
      this.stopRequested = false;

      for (let i = 0; i < trainIterations; ++i) {
        if (this.renderDuringTraining) {
          await this.trainV2();
        } else {
          await trainModelForNumberOfGames({
            maxEpsilon: this.maxEpsilon,
            minEpsilon: this.minEpsilon,
            discountRate: this.discountRate,
            gamesPerIteration: this.gamesPerIteration,
            maxStepsPerGame: this.maxStepsPerGame,
            beforeEvening: this.gameStateService.beforeEvening,
            policyNet: this.policyNet,
            onGameEnd: this.onGameEnd.bind(this),
          });
        }
        this.onIterationEnd(i + 1, trainIterations);
        await tf.nextFrame();  // Unblock UI thread.
        await this.policyNet.saveModel();
        await this.updateUIControlState();
      }

      this.enableModelControls();
    }
  }

  public test() {
    this.testState = !this.testState;

    if(this.testState) {
      this.testV2();
    } else {
      this.gameStateService.stopTest.next(true);
    }
  }

  private disableModelControls() {
    this.trainButtonText = 'Stop';
    this.disabledStatus.testButton = true;
    this.disabledStatus.deleteStoredModelButton = true;
  }

  private enableModelControls() {
    this.trainButtonText = 'Train';
    this.disabledStatus.testButton = false;
    this.disabledStatus.deleteStoredModelButton = false;
  }

  private onIterationEnd(iterationCount, totalIterations) {
    this.iterationStatus = `Iteration ${iterationCount} of ${totalIterations}`;
    this.iterationProgress = iterationCount / totalIterations * 100;
  }

  public onGameEnd(gameCount: number, totalGames: number) {
    this.gameStatus = `Game ${gameCount} of ${totalGames}`;
    this.gameProgress = gameCount / totalGames * 100;

    if (gameCount === totalGames) {
      this.gameStatus = 'Updating weights...';
    }
  }

    /**
   * Train the policy network's model.
   *
   * @returns {number[]} The number of steps completed in the `numGames` games
   *   in this round of training.
   */
  private async trainV2() {
    this.onGameEnd(0, this.gamesPerIteration);
    let memory = new Memory(this.maxStepsPerGame);
    for (let i = 0; i < this.gamesPerIteration; ++i) {
      // Randomly initialize the state of the cart-pole system at the beginning
      // of every game.
      this.gameStateService.refreshGame.next();
      const orchestrator = new Orchestrator(
        this.policyNet,
        memory,
        this.discountRate,
        this.maxStepsPerGame,
        this.gameStateService,
        this.maxEpsilon,
        this.minEpsilon,
        this.lambda
      );
      await orchestrator.run();
      this.onGameEnd(i + 1, this.gamesPerIteration);
      memory = new Memory(this.maxStepsPerGame);
    }
  }

  private testV2() {
    const memory = new Memory(this.maxStepsPerGame);
    const orchestrator = new Orchestrator(
      this.policyNet,
      memory,
      0,
      0,
      this.gameStateService,
      this.maxEpsilon,
      this.minEpsilon,
      this.lambda
    );
    orchestrator.test();
  }
}
