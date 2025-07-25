import type { StateUpdate } from "@before-evening/game-engine";
import * as tf from "@tensorflow/tfjs";

import { ACTIVATION, LOSS, OPTIMIZER } from "./constants";

/**
 * This class is used to create a model for reinforcement learning.
 * It uses a neural network to predict the next action based on the current state.
 * The model is defined by the number of hidden layers and the number of units in each layer.
 */
export class ReinforcementLearningModel {
	public numStates: number;
	public numActions: number;
	public batchSize: number;
	public network: tf.Sequential | tf.LayersModel;

	/**
	 * @param {number | tf.LayersModel} hiddenLayerSizesOrModel
	 * @param {number} numStates
	 * @param {number} numActions1
	 * @param {number} batchSize
	 */
	constructor(
		hiddenLayerSizesOrModel: number | tf.LayersModel,
		numStates: number,
		numActions: number,
		batchSize: number,
	) {
		this.numStates = numStates;
		this.numActions = numActions;
		this.batchSize = batchSize;

		if (Number.isInteger(hiddenLayerSizesOrModel)) {
			this.defineModel(hiddenLayerSizesOrModel as number);
		} else {
			this.network = hiddenLayerSizesOrModel as tf.LayersModel;
			this.network.summary();
			this.network.compile({ optimizer: OPTIMIZER, loss: LOSS });
		}
	}

	/**
	 * Initializes the model with the given hidden layer sizes.
	 *
	 * @param {number | number[]} hiddenLayerSizeOrSizes
	 */
	defineModel(hiddenLayerSizeOrSizes: number | number[]) {
		let hiddenLayerSizes: number[];
		if (!Array.isArray(hiddenLayerSizeOrSizes)) {
			hiddenLayerSizes = [hiddenLayerSizeOrSizes];
		} else {
			hiddenLayerSizes = hiddenLayerSizeOrSizes;
		}

		this.network = tf.sequential();
		hiddenLayerSizes.forEach((hiddenLayerSize, i) => {
			(this.network as tf.Sequential).add(
				tf.layers.dense({
					units: hiddenLayerSize,
					activation: ACTIVATION,
					// `inputShape` is required only for the first layer.
					inputShape: i === 0 ? [this.numStates] : undefined,
				}),
			);
		});
		(this.network as tf.Sequential).add(
			tf.layers.dense({ units: this.numActions }),
		);

		this.network.summary();
		this.network.compile({ optimizer: OPTIMIZER, loss: LOSS });
	}

	/**
	 * Predicts the next action based on the provided states.
	 * @param {tf.Tensor | tf.Tensor[]} states
	 * @returns {tf.Tensor | tf.Tensor} The predictions of the state
	 */
	public predictNextActionQ(states: tf.Tensor) {
		if (states.isDisposed) {
			console.log(states);
			return null;
		}
		return tf.tidy(() => this.network.predict(states));
	}

	/**
	 * Predicts the next action based on the current state.
	 * @param {: tf.Tensor | tf.Tensor2D} states
	 * @returns {number} The predictions of the best action
	 */
	public predictAction(states: tf.Tensor) {
		const prediction = tf.tidy(() =>
			(this.network.predict(states) as tf.Tensor<tf.Rank>).dataSync(),
		) as Float32Array;

		// Select the action with the highest Q-value
		return prediction.indexOf(Math.max(...Array.from(prediction.values()))) - 1;
	}

	/**
	 * @param {tf.Tensor[]} xBatch
	 * @param {tf.Tensor[]} yBatch
	 */
	public async train(xBatch: tf.Tensor2D, yBatch: tf.Tensor2D) {
		await this.network.fit(xBatch, yBatch, {
			epochs: 3,
			batchSize: this.batchSize,
			verbose: 0,
		});
	}

	/**
	 * Choose an action based on the current state and epsilon-greedy policy.
	 * The epsilon-greedy policy is a strategy used in reinforcement learning
	 * to balance exploration and exploitation.
	 * @param state
	 * @param eps
	 * @returns {number} The action chosen by the model (-1 : 6)
	 */
	public chooseAction(state: tf.Tensor2D, eps: number) {
		if (Math.random() < eps) {
			return Math.floor(Math.random() * this.numActions) - 1;
		}
		return this.predictAction(state);
	}

	public static getState(state: StateUpdate): tf.Tensor2D {
		return tf.tensor2d([[state.playerX, ...state.next5Curve, state.speed]]);
	}

	public static computeReward(position: number, speed: number) {
		let reward: number;
		// position can be between -3:3
		// if position is not in range -1:1 that means car is out of bounds
		if (position < -1 || position > 1) {
			// max minus 50 reward if car is not in road
			reward = -10 + -20 * (Math.abs(position) - 1);
		} else {
			// max 100 reward if car is inside the road
			// min 10 reward if car is inside the road
			reward = 100 - 90 * Math.abs(position);
		}

		// max minus 50 reward if speed is not max
		reward -= 50 * (1 - speed);

		return reward;
	}

	public static computeRelativeReward({
		reward,
		previousReward,
		x,
		speed,
	}: {
		reward: number;
		previousReward: number;
		x: number;
		speed: number;
	}) {
		// relative reward is the evaluation of current state compared to previous state
		// in this way we hope to evaluate the action based on the change happened
		// rather than the current state's positivity.
		//
		// for example if car is in the middle of the road at max speed, if model picks
		// a left move, car will slow down and move from center. But because of the new state
		// is very near to the perfect position reward of state will close to max reward.
		// But in practice the action have a negative impact on car's movement.
		const relativeReward = reward - previousReward;

		// if relative reward is zero and car is not at the center of road or speed is not at max
		// then return min possible reward
		if (relativeReward === 0 && (x !== 0 || speed !== 1)) {
			return -100;
		}

		// because of the change of position will be so low due to fact that each action will
		// take nearly 0.01 seconds, relative reward will be too low. Between 0.20 and -0.35
		// thus we magnify the relative reward to increase the effect of decision
		return relativeReward * 1000;
	}
}
