import * as fs from "node:fs";
import path from "node:path";

import { BeforeEveningGameEngine } from "@before-evening/game-engine";
import {
	type LogData,
	MODEL_VERSION,
	trainModelForNumberOfGames,
} from "@before-evening/shared";

import { MODEL_SAVE_PATH } from "./constants";
import { SaveableNodePolicyNetwork } from './policy-network.node';

const MIN_EPSILON = 0.5;
const MAX_EPSILON = 0.8;

class NodeTensorflow {
	private policyNet: SaveableNodePolicyNetwork;
	private hiddenLayerSize: number;
	private readonly numberOfIterations: string;
	private readonly gamesPerIteration: number;
	private readonly maxStepsPerGame: number;
	private readonly discountRate: number;
	private readonly learningRate: number;
	private iterationStatus: string;
	private gameStatus: string;
	private beforeEvening: BeforeEveningGameEngine;
	private startTime: Date;

	constructor() {
		this.hiddenLayerSize = 1024;
		this.numberOfIterations = "50";
		this.gamesPerIteration = 100;
		this.maxStepsPerGame = 1000;
		this.discountRate = 0.95;
		this.learningRate = 1;
		this.iterationStatus = "";
		this.gameStatus = "";
		this.startTime = new Date();

		this.initialize();
	}

	private async initialize() {
		if (
			fs.existsSync(path.resolve(`../../shared/${MODEL_VERSION}/model.json`))
		) {
			this.policyNet = await SaveableNodePolicyNetwork.loadModel(
				this.maxStepsPerGame,
				MODEL_SAVE_PATH,
			);
			this.hiddenLayerSize = this.policyNet.hiddenLayerSizes() as number;
		} else {
			await this.createModel();
		}

		this.beforeEvening = new BeforeEveningGameEngine();

		await this.train();
	}

	private async createModel() {
		console.log("Creating a new model...");
		this.policyNet = new SaveableNodePolicyNetwork({
			hiddenLayerSizesOrModel: this.hiddenLayerSize,
			maxStepsPerGame: this.maxStepsPerGame,
			modelName: MODEL_SAVE_PATH,
		});
	}

	private async train() {
		const trainIterations = Number.parseInt(this.numberOfIterations);
		if (!(trainIterations > 0)) {
			throw new Error(`Invalid number of iterations: ${trainIterations}`);
		}

		if (!(this.gamesPerIteration > 0)) {
			throw new Error(
				`Invalid # of games per iterations: ${this.gamesPerIteration}`,
			);
		}

		if (!(this.maxStepsPerGame > 1)) {
			throw new Error(`Invalid max. steps per game: ${this.maxStepsPerGame}`);
		}

		if (!(this.discountRate > 0 && this.discountRate < 1)) {
			throw new Error(`Invalid discount rate: ${this.discountRate}`);
		}

		if (!(this.learningRate > 0 && this.learningRate < 1)) {
			throw new Error(`Invalid learning rate: ${this.learningRate}`);
		}

		this.onIterationEnd(0, trainIterations);
		for (let iteration = 0; iteration < trainIterations; ++iteration) {
			this.onGameEnd(0, this.gamesPerIteration);
			const dataset = await trainModelForNumberOfGames({
				maxEpsilon: MAX_EPSILON,
				minEpsilon: MIN_EPSILON,
				discountRate: this.discountRate,
				learningRate: this.learningRate,
				gamesPerIteration: this.gamesPerIteration,
				maxStepsPerGame: this.maxStepsPerGame,
				beforeEvening: this.beforeEvening,
				policyNet: this.policyNet,
				onGameEnd: this.onGameEnd.bind(this),
			});
			this.writeLogToFile(dataset);
			this.onIterationEnd(iteration + 1, trainIterations);
			await this.policyNet.saveModel();
		}
	}

	private onIterationEnd(iterationCount: number, totalIterations: number) {
		this.iterationStatus = `Iteration ${iterationCount} of ${totalIterations}`;

		console.log(
			"\n",
			"--------------------------------------------------",
			"\n",
			this.iterationStatus,
			"\n",
		);
	}

	private onGameEnd(gameCount: number, totalGames: number) {
		this.gameStatus = `Game ${gameCount} of ${totalGames}`;

		console.log(
			"*********",
			"\n",
			this.iterationStatus,
			"\n",
			this.gameStatus,
			"\n",
		);
		console.log(this.getPassedTime());

		if (gameCount === totalGames) {
			this.gameStatus = "Updating weights...";
		}
	}

	private writeLogToFile(dataset: LogData[]) {
		const logStream = fs.createWriteStream("dataset.txt", { flags: "a" });
		for (const action of dataset) {
			logStream.write(`${JSON.stringify(action)}\n`);
		}
		logStream.end();
	}

	private getPassedTime() {
		const minutes =
			(new Date().getTime() - this.startTime.getTime()) / 1000 / 60;
		const hours = Math.floor(minutes / 60);
		const seconds = (((minutes * 100) % 100) / 100) * 60;

		return `Total time: ${hours} hours ${(
			minutes - hours * 60
		).toFixed()} minutes ${seconds.toFixed()} seconds`;
	}
}

new NodeTensorflow();
