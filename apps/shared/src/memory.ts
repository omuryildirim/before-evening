import type * as tf from "@tensorflow/tfjs";
import sampleSize from "lodash.samplesize";

export class Memory {
	private readonly maxMemory: number;
	private readonly samples: [tf.Tensor2D, number, number, tf.Tensor2D][];

	/**
	 * @param {number} maxMemory
	 */
	constructor(maxMemory: number) {
		this.maxMemory = maxMemory;
		this.samples = [];
	}

	/**
	 * @param {Array} sample
	 */
	addSample(sample: [tf.Tensor2D, number, number, tf.Tensor2D]) {
		this.samples.push(sample);
		if (this.samples.length > this.maxMemory) {
			const [state, , , nextState] = this.samples.shift();
			state.dispose();
			nextState.dispose();
		}
	}

	/**
	 * @param {number} nSamples
	 * @returns {Array} Randomly selected samples
	 */
	sample(nSamples: number) {
		return sampleSize(this.samples, nSamples);
	}
}
