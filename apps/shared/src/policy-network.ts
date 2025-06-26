import * as tf from "@tensorflow/tfjs";

import { NUMBER_OF_ACTIONS, NUMBER_OF_STATES } from "./constants";
import type { Memory } from "./memory";
import { ReinforcementLearningModel } from "./reinforcement-learning.model";

/**
 * PolicyNetwork is a class that implements a reinforcement learning method.
 * It uses a neural network to predict the Q-values of actions given a state.
 * The Q-values are used to determine the best action to take in a given state.
 * The class is designed to be used with the Before Evening game engine.
 */
class PolicyNetwork {
	model: ReinforcementLearningModel;

	/**
	 * Constructor of PolicyNetwork.
	 *
	 * @param hiddenLayerSizesOrModel
	 *   Can be any of the following
	 *   - Size of the hidden layer, as a single number (for a single hidden
	 *     layer)
	 *   - An instance of tf.LayersModel.
	 * @param maxStepsPerGame
	 */
	constructor(
		hiddenLayerSizesOrModel: number | tf.LayersModel,
		maxStepsPerGame: number,
	) {
		this.model = new ReinforcementLearningModel(
			hiddenLayerSizesOrModel,
			NUMBER_OF_STATES,
			NUMBER_OF_ACTIONS,
			maxStepsPerGame,
		);
	}

	public async educateTheNet(
		memory: Memory,
		discountRate: number,
		learningRate = 1,
	) {
		// Sample from memory
		const batch = memory.sample(this.model.batchSize);
		const states = batch.map(([state, ,]) => state);
		const nextStates = batch.map(([, , , nextState]) =>
			nextState ? nextState : tf.zeros([this.model.numStates]),
		);

		// Predict the values of each action at each state
		const qsa = states.map((state) => this.model.predictNextActionQ(state));
		// Predict the values of each action at each next state
		const qsad = nextStates.map((nextState) =>
			this.model.predictNextActionQ(nextState),
		);

		const x: Float32Array<ArrayBufferLike>[] = [];
		const y: Float32Array<ArrayBufferLike>[] = [];

		// Update the states rewards with the discounted next states rewards
		batch.forEach(([state, action, reward, nextState], index) => {
			if (qsa[index]) {
				const currentQ = (qsa as tf.Tensor[])[
					index
				].dataSync() as Float32Array<ArrayBufferLike>;
				currentQ[action] = nextState
					? currentQ[action] +
						(learningRate || 1) *
							(reward +
								discountRate *
									(qsad as tf.Tensor[])[index].max().dataSync()[0] -
								currentQ[action])
					: currentQ[action];
				x.push(state.dataSync() as Float32Array<ArrayBufferLike>);
				y.push(currentQ);
			} else {
				qsa.splice(index, 1);
				qsad.splice(index, 1);
			}
		});

		// Clean unused tensors
		for (const state of qsa) {
			(state as tf.Tensor).dispose();
		}
		for (const state of qsad) {
			(state as tf.Tensor).dispose();
		}

		// Reshape the batches to be fed to the network
		const xTensor = tf.tensor2d(x as unknown as number[], [
			x.length,
			this.model.numStates,
		]);
		const yTensor = tf.tensor2d(y as unknown as number[], [
			y.length,
			this.model.numActions,
		]);

		// Learn the Q(s, a) values given associated discounted rewards
		await this.model.train(xTensor, yTensor);

		xTensor.dispose();
		yTensor.dispose();
	}
}

export type SaveablePolicyNetworkParams = {
	hiddenLayerSizesOrModel: number | tf.LayersModel;
	maxStepsPerGame: number;
	modelName: string;
};

/**
 * A subclass of PolicyNetwork that supports saving and loading.
 */
export class SaveablePolicyNetwork extends PolicyNetwork {
	readonly modelName: string;

	/**
	 * Constructor of SaveablePolicyNetwork
	 *
	 * @param hiddenLayerSizesOrModel
	 * @param maxStepsPerGame
	 * @param fileModel
	 * @param modelName
	 */
	constructor({
		hiddenLayerSizesOrModel,
		maxStepsPerGame,
		modelName,
	}: SaveablePolicyNetworkParams) {
		super(hiddenLayerSizesOrModel, maxStepsPerGame);
		this.modelName = modelName;
	}

	/**
	 * Save the model to IndexedDB.
	 */
	async saveModel(): Promise<ReturnType<typeof this.model.network.save>> {
		return await this.model.network.save(this.modelName);
	}

	/**
	 * Load the model fom IndexedDB.
	 *
	 * @returns {SaveablePolicyNetwork} The instance of loaded
	 *   `SaveablePolicyNetwork`.
	 * @throws {Error} If no model can be found in IndexedDB.
	 */
	static async loadModel(
		maxStepsPerGame: number,
		modelName: string,
		browserModel?: boolean,
	) {
		console.log("Loading existing model...");
		const model = await tf.loadLayersModel(
			browserModel ? modelName : `${modelName}/model.json`,
		);
		if (model) {
			console.log(`Loaded model from ${modelName}`);
			return new SaveablePolicyNetwork({
				hiddenLayerSizesOrModel: model,
				maxStepsPerGame,
				modelName,
			});
		}
		throw new Error(`Cannot find model at ${modelName}.`);
	}

	/**
	 * Check the status of locally saved model.
	 *
	 * @returns If the locally saved model exists, the model info as a JSON
	 *   object. Else, `undefined`.
	 */
	static async checkStoredModelStatus(modelName: string) {
		try {
			return await tf.loadLayersModel(modelName);
		} catch (_e) {
			return null;
		}
	}

	/**
	 * Remove the locally saved model from IndexedDB.
	 */
	async removeModel(): Promise<ReturnType<typeof tf.io.removeModel>> {
		return await tf.io.removeModel(this.modelName);
	}

	/**
	 * Get the sizes of the hidden layers.
	 *
	 * @returns {number | number[]} If the model has only one hidden layer,
	 *   return the size of the layer as a single number. If the model has
	 *   multiple hidden layers, return the sizes as an Array of numbers.
	 */
	public hiddenLayerSizes() {
		const sizes: unknown[] = [];
		for (let i = 0; i < this.model.network.layers.length - 1; ++i) {
			sizes.push(
				(this.model.network.layers[i] as unknown as { units: unknown }).units,
			);
		}
		return sizes.length === 1 ? sizes[0] : sizes;
	}
}
