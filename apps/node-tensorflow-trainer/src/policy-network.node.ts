import * as tf from "@tensorflow/tfjs-node";

import {
	ACTIVATION,
	LOSS,
	NUMBER_OF_ACTIONS,
	NUMBER_OF_STATES,
	OPTIMIZER,
	SaveablePolicyNetwork,
	type SaveablePolicyNetworkParams,
} from "@before-evening/shared";

export class SaveableNodePolicyNetwork extends SaveablePolicyNetwork {
	constructor({
		hiddenLayerSizesOrModel,
		maxStepsPerGame,
		modelName,
	}: SaveablePolicyNetworkParams) {
		let model = hiddenLayerSizesOrModel;

		if (Number.isInteger(model)) {
			model = tf.sequential();
			[hiddenLayerSizesOrModel as number].forEach((hiddenLayerSize, i) => {
				(model as tf.Sequential).add(
					tf.layers.dense({
						units: hiddenLayerSize,
						activation: ACTIVATION,
						// `inputShape` is required only for the first layer.
						inputShape: i === 0 ? [NUMBER_OF_STATES] : undefined,
					}),
				);
			});
			(model as tf.Sequential).add(
				tf.layers.dense({ units: NUMBER_OF_ACTIONS }),
			);

			model.summary();
			model.compile({ optimizer: OPTIMIZER, loss: LOSS });
		}

		super({
			hiddenLayerSizesOrModel: model,
			maxStepsPerGame,
			modelName,
		});
	}

	/**
	 * Load the model fom file.
	 *
	 * @returns {SaveablePolicyNetwork} The instance of loaded
	 *   `SaveablePolicyNetwork`.
	 * @throws {Error} If no model can be found in file.
	 */
	static async loadModel(
		maxStepsPerGame: number,
		modelName: string,
	) {
		console.log("Loading existing model...");
		const model = await tf.loadLayersModel(`${modelName}/model.json`);
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

	async saveModel(): Promise<ReturnType<typeof this.model.network.save>> {
		return await this.model.network.save(`file://${this.modelName}`);
	}
}
