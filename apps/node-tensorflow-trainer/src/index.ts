import * as fs from "node:fs";
import path from "node:path";
import { BeforeEveningGameEngine } from "@before-evening/game-engine";
import {
	type LogData,
	MODEL_VERSION,
	trainModelForNumberOfGames,
} from "@before-evening/shared";
import ora, { type Ora } from "ora";

import { MODEL_SAVE_PATH } from "./constants";
import { SaveableNodePolicyNetwork } from "./policy-network.node";

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
	private spinner: Ora;

	constructor() {
		this.hiddenLayerSize = 1024;
		this.numberOfIterations = "50";
		this.gamesPerIteration = 100;
		this.maxStepsPerGame = 1000;
		this.discountRate = 0.95;
		this.learningRate = 0.9;
		this.iterationStatus = "";
		this.gameStatus = "";
		this.startTime = new Date();

		// Handle Ctrl+C to stop the spinner and exit
		process.on("SIGINT", () => {
			if (this.spinner) {
				this.spinner.fail("Process interrupted by user.");
			}
			process.exit(1);
		});

		this.initialize();
	}

	private resolveModelPath() {
		let sharedFolderPrefix = "../shared/";
		if (!fs.existsSync(path.resolve(sharedFolderPrefix))) {
			sharedFolderPrefix = `../${sharedFolderPrefix}`;
		}
		return path.resolve(`${sharedFolderPrefix}${MODEL_VERSION}`);
	}

	private async initialize() {
		if (fs.existsSync(`${this.resolveModelPath()}/model.json`)) {
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
			modelName: this.resolveModelPath(),
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

		this.onIterationEnd(1, trainIterations);
		for (let iteration = 0; iteration < trainIterations; ++iteration) {
			this.spinner = ora(
				`Training iteration ${iteration + 1} of ${trainIterations}...`,
			).start();
			this.spinner.stop();
			this.onGameEnd(0, this.gamesPerIteration);
			try {
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
				this.onIterationEnd(iteration + 2, trainIterations);
				await this.policyNet.saveModel();
				this.spinner.succeed(`Iteration ${iteration + 1} completed.`);
			} catch (error) {
				this.spinner.fail(
					`Iteration ${iteration + 1} failed: ${error.message}`,
				);
				throw error; // Re-throw the error to stop execution if needed
			}
		}
	}

	private onIterationEnd(iterationCount: number, totalIterations: number) {
		this.iterationStatus = `Iteration ${iterationCount} of ${totalIterations}`;
	}

	private onGameEnd(gameCount: number, totalGames: number) {
		this.gameStatus = `Game ${gameCount} of ${totalGames}`;

		if (this.spinner) {
			this.spinner.text = `${this.iterationStatus} | ${this.gameStatus} | ${this.getPassedTime()}`;
			this.spinner.render();
		}
	}

	private writeLogToFile(dataset: LogData[]) {
		fs.writeFileSync(path.resolve("dataset.txt"), JSON.stringify(dataset), {
			flag: "w",
		});
	}

	private getPassedTime() {
		const minutes = (Date.now() - this.startTime.getTime()) / 1000 / 60;
		const hours = Math.floor(minutes / 60);
		const seconds = (((minutes * 100) % 100) / 100) * 60;

		return `Total time: ${hours} hours ${(
			minutes - hours * 60
		).toFixed()} minutes ${seconds.toFixed()} seconds`;
	}
}

new NodeTensorflow();
