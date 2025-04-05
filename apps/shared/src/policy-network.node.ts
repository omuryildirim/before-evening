import * as tf from "@tensorflow/tfjs-node";

import { SaveablePolicyNetwork } from "./policy-network";

export class SaveableNodePolicyNetwork extends SaveablePolicyNetwork {
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
}
