import {AfterViewInit, Component, OnInit} from '@angular/core';
import * as tf from "@tensorflow/tfjs";

import {Memory} from "../../../../shared/memory";
import {SaveablePolicyNetwork} from "../../../../shared/policy-network";
import {GameStateService} from "../game-state.service";

import {MODEL_SAVE_PATH} from "./helpers/constants";
import {Orchestrator} from "./helpers/orchestrator";

@Component({
  selector: 'reinforcement-learning',
  templateUrl: './reinforcement-learning.component.html',
  styleUrls: ['./reinforcement-learning.component.scss']
})
export class ReinforcementLearningComponent implements OnInit, AfterViewInit {
  private policyNet: SaveablePolicyNetwork;
  public hiddenLayerSize: string;
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
  public numberOfIterations: string;
  public gamesPerIteration: string;
  public maxStepsPerGame: string;
  public discountRate: string;
  public iterationStatus: string;
  public iterationProgress: number;
  public maxPositionValues: { x: number; y: number; }[];
  public bestPositionText: string;
  public gameStatus: string;
  public gameProgress: number;
  private testState: boolean;

  /**
   * Initializer.
   * @param gameStateService
   */
  constructor(private gameStateService: GameStateService) {
  }

  ngOnInit() {
    this.hiddenLayerSize = "128";
    this.storedModelStatus = "N/A";
    this.numberOfIterations = "20";
    this.gamesPerIteration = "20";
    this.maxStepsPerGame = "3000";
    this.discountRate = "0.95";
    this.trainButtonText = 'Train';
    this.iterationStatus = "";
    this.iterationProgress = 0;
    this.gameStatus = "";
    this.gameProgress = 0;
  }

  ngAfterViewInit() {
    this.initializeView();
  }

  private async initializeView() {
    if (await SaveablePolicyNetwork.checkStoredModelStatus(MODEL_SAVE_PATH) != null) {
      const maxStepsPerGame = Number.parseInt(this.maxStepsPerGame);
      this.policyNet = await SaveablePolicyNetwork.loadModel(maxStepsPerGame, MODEL_SAVE_PATH, true);
      this.hiddenLayerSize = this.policyNet.hiddenLayerSizes();
    }
    await this.updateUIControlState();
  };

  public async createModel() {
    try {
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
      this.policyNet = new SaveablePolicyNetwork({hiddenLayerSizesOrModel: hiddenLayerSizes, maxStepsPerGame, modelName: MODEL_SAVE_PATH});
      await this.policyNet.saveModel();

      await this.updateUIControlState();
    } catch (err) {
      // logStatus(`ERROR: ${err.message}`);
    }
  }

  private async updateUIControlState() {
    if (this.policyNet == null) {
      this.storedModelStatus = 'No stored model.';
      this.disabledStatus.deleteStoredModelButton = true;
    } else {
      this.storedModelStatus = `Saved@`;
      this.disabledStatus.deleteStoredModelButton = false;
      this.disabledStatus.createModelButton = true;
    }
    this.disabledStatus.createModelButton = this.policyNet != null;
    this.disabledStatus.hiddenLayerSizesInput = this.policyNet != null;
    this.disabledStatus.trainButton = this.policyNet == null;
    this.disabledStatus.testButton = this.policyNet == null;
  }

  public async deleteStoredModel() {
    if (confirm(`Are you sure you want to delete the locally-stored model?`)) {
      await this.policyNet.removeModel();
      this.policyNet = null;
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

      this.maxPositionValues = [];
      this.onIterationEnd(0, trainIterations);
      this.stopRequested = false;
      for (let i = 0; i < trainIterations; ++i) {
        const maxPosition = await this.trainV2();
        this.maxPositionValues.push({x: i + 1, y: maxPosition});
        this.bestPositionText = `Best position was ${maxPosition}`;
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
    const maxPositionStore: number[] = [];
    this.onGameEnd(0, this.parsedGamesPerIteration);
    let memory = new Memory(this.parsedMaxStepsPerGame);
    for (let i = 0; i < this.parsedGamesPerIteration; ++i) {
      // Randomly initialize the state of the cart-pole system at the beginning
      // of every game.
      this.gameStateService.refreshGame.next();
      const orchestrator = new Orchestrator(
        this.policyNet,
        memory,
        this.parsedDiscountRate,
        this.parsedMaxStepsPerGame,
        this.gameStateService
      );
      await orchestrator.run();
      maxPositionStore.push(orchestrator.maxPositionStore[orchestrator.maxPositionStore.length - 1]);
      this.onGameEnd(i + 1, this.parsedGamesPerIteration);
      memory = new Memory(this.parsedMaxStepsPerGame);
    }
    return Math.max(...maxPositionStore);
  }

  private testV2() {
    const memory = new Memory(this.parsedMaxStepsPerGame);
    const orchestrator = new Orchestrator(
      this.policyNet,
      memory,
      0,
      0,
      this.gameStateService
    );
    orchestrator.test();
  }

  get parsedMaxStepsPerGame() {
    return parseInt(this.maxStepsPerGame);
  }

  get parsedGamesPerIteration() {
    return parseInt(this.gamesPerIteration);
  }

  get parsedDiscountRate() {
    return parseInt(this.discountRate);
  }
}
