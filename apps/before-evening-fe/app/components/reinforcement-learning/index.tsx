import { SaveablePolicyNetwork } from "@before-evening/shared";
import React, { useState, useEffect, useCallback } from "react";
import type GameStateService from "~/components/GameStateService";
import { InputGroup } from "~/components/reinforcement-learning/InputGroup";
import { ModelOptions } from "~/components/reinforcement-learning/ModelOptions";
import { useModelOptions } from "~/components/reinforcement-learning/ModelOptions/useModelOptions";
import { TrainAndTestSection } from "~/components/reinforcement-learning/TrainAndTestSection";
import {
	LOCAL_STORAGE_MODEL_PATH,
	MODEL_SAVE_PATH,
	localStorageModelName,
	preTrainedModelName,
} from "./constants";

interface Params {
	gameStateService: GameStateService;
}

const ReinforcementLearningComponent = ({ gameStateService }: Params) => {
	const [policyNet, setPolicyNet] = useState<
		SaveablePolicyNetwork | undefined
	>();

	const modelOptions = useModelOptions();

	const [storedModelStatus, setStoredModelStatus] = useState("N/A");
	const [modelNames, setModelNames] = useState([
		{ key: MODEL_SAVE_PATH, value: preTrainedModelName },
	]);
	const [_localStorageModel, setLocalStorageModel] = useState(false);
	const [modelSavePath, setModelSavePath] = useState("");

	const initializeView = useCallback(async () => {
		const localStorageModelExists =
			await SaveablePolicyNetwork.checkStoredModelStatus(
				LOCAL_STORAGE_MODEL_PATH,
			);
		if (localStorageModelExists) {
			setModelNames((prevModelNames) => [
				prevModelNames[0],
				{ key: LOCAL_STORAGE_MODEL_PATH, value: localStorageModelName },
			]);
			setLocalStorageModel(true);
		}
		modelOptions.setIsDeleteStoredModelButtonDisabled(!localStorageModelExists);
		modelOptions.setIsCreateModelButtonDisabled(!!localStorageModelExists);

		setModelSavePath(
			localStorageModelExists ? LOCAL_STORAGE_MODEL_PATH : MODEL_SAVE_PATH,
		);
	}, []);

	useEffect(() => {
		initializeView().then();
	}, [initializeView]);

	const processModelDetails = useCallback(
		(modelName: string) => {
			const isLocalStorageModel = modelName !== MODEL_SAVE_PATH;
			setLocalStorageModel(isLocalStorageModel);
			setStoredModelStatus(
				isLocalStorageModel ? localStorageModelName : preTrainedModelName,
			);

			modelOptions.setIsDeleteStoredModelButtonDisabled(!isLocalStorageModel);
			modelOptions.setIsCreateModelButtonDisabled(isLocalStorageModel);
			modelOptions.setIsHiddenLayerSizeInputDisabled(isLocalStorageModel);
			modelOptions.setIsTrainButtonDisabled(!isLocalStorageModel);
			modelOptions.setIsTestButtonDisabled(false);
		},
		[
			setLocalStorageModel,
			setStoredModelStatus,
			modelOptions.setIsDeleteStoredModelButtonDisabled,
			modelOptions.setIsCreateModelButtonDisabled,
			modelOptions.setIsHiddenLayerSizeInputDisabled,
			modelOptions.setIsTrainButtonDisabled,
			modelOptions.setIsTestButtonDisabled,
		],
	);

	const loadModel = useCallback(async () => {
		const loadedPolicyNet = await SaveablePolicyNetwork.loadModel(
			modelOptions.maxStepsPerGame,
			modelSavePath,
			true,
		);
		setPolicyNet(loadedPolicyNet);
		modelOptions.setHiddenLayerSize(
			loadedPolicyNet.hiddenLayerSizes() as number,
		);
		processModelDetails(modelSavePath);
	}, [modelOptions.maxStepsPerGame, modelSavePath]);

	useEffect(() => {
		if (modelSavePath) {
			loadModel().then();
		}
	}, [modelSavePath]);

	const createModel = useCallback(async () => {
		try {
			const newPolicyNet = new SaveablePolicyNetwork({
				hiddenLayerSizesOrModel: modelOptions.hiddenLayerSize,
				maxStepsPerGame: modelOptions.maxStepsPerGame,
				modelName: LOCAL_STORAGE_MODEL_PATH,
			});
			await newPolicyNet.saveModel();
			setModelSavePath(LOCAL_STORAGE_MODEL_PATH);
			setPolicyNet(newPolicyNet);
			setLocalStorageModel(true);
			setStoredModelStatus(localStorageModelName);
			modelOptions.setIsDeleteStoredModelButtonDisabled(false);
			modelOptions.setIsCreateModelButtonDisabled(true);
			modelOptions.setIsHiddenLayerSizeInputDisabled(!!policyNet);
			modelOptions.setIsTrainButtonDisabled(false);
			modelOptions.setIsTestButtonDisabled(false);
			setModelNames((prevModelNames) => [
				prevModelNames[0],
				{ key: LOCAL_STORAGE_MODEL_PATH, value: localStorageModelName },
			]);
		} catch (err) {
			console.error(`ERROR: ${(err as Error).message}`);
		}
	}, [
		modelOptions.hiddenLayerSize,
		modelOptions.maxStepsPerGame,
		modelSavePath,
	]);

	const deleteStoredModel = useCallback(async () => {
		if (
			window.confirm(
				"Are you sure you want to delete the locally-stored model?",
			)
		) {
			await policyNet?.removeModel();
			setPolicyNet(undefined);
			setModelNames((prevModelNames) =>
				prevModelNames.filter(
					(model) => model.key !== LOCAL_STORAGE_MODEL_PATH,
				),
			);
			setModelSavePath(MODEL_SAVE_PATH);
			setStoredModelStatus("No stored model.");
			modelOptions.setIsDeleteStoredModelButtonDisabled(true);
		}
	}, [policyNet]);

	return (
		<div className="tfjs-example-container centered-container">
			<section className="title-area">
				<h1>TensorFlow.js: Reinforcement Learning</h1>
				<p className="subtitle">
					Train a model to make a car drive autonomously using reinforcement
					learning.
				</p>
			</section>

			<section>
				<p className="section-head">Instructions</p>
				<ul>
					<li>
						We have already trained a model for over 6 million iterations. You
						can't train this model more. Instead you can test this model and see
						how great it is! But you can also create a model that would be
						stored in your browser's localstorage. To do this:
					</li>
					<li>Choose a hidden layer size and click "Create Model".</li>
					<li>Select training parameters and then click "Train".</li>
					<li>
						Note that while the model is training it periodically saves a copy
						of itself to localstorage, this mean you can refresh the page and
						continue training from the last save point. If at any point you want
						to start training from scratch, click "Delete stored Model".
					</li>
					<li>
						Once the model has finished training you can click "Test" to see if
						your model can drive autonomously. You can also click 'Stop' to
						pause the training after the current iteration ends if you want to
						test the model sooner.
					</li>
					<li>
						You can watch the training. But this may take long due to fact that
						agent needs to be trained for couple of hundred thousand steps to
						learn basics of driving. Therefore, you can also select to train
						without rendering the training. We already set the recommended
						parameters for training. But you can play around and see the effects
						of parameters.
					</li>
				</ul>
			</section>

			<section>
				{modelNames.length > 1 && (
					<div>
						<p className="section-head">Selected model</p>
						<div>
							<select
								value={modelSavePath}
								className="block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
								onChange={(e) => setModelSavePath(e.target.value)}
							>
								{modelNames.map((model) => (
									<option key={model.key} value={model.key}>
										{model.value}
									</option>
								))}
							</select>
						</div>
					</div>
				)}

				<div>
					<p className="section-head">Initialize Model</p>
					<div className="with-cols">
						<div className="with-rows init-model">
							<div className="input-div with-rows">
								<InputGroup
									id="hiddenLayerSize"
									label="Hidden layer size(s)"
									value={modelOptions.hiddenLayerSize}
									onChange={(e) =>
										modelOptions.setHiddenLayerSize(e.target.valueAsNumber)
									}
									type="number"
									disabled={modelOptions.isHiddenLayerSizeInputDisabled}
								/>
							</div>
							<button
								onClick={createModel}
								disabled={modelOptions.isCreateModelButtonDisabled}
								type="button"
								className={
									modelOptions.isCreateModelButtonDisabled
										? "bg-gray-600 disabled"
										: "cursor-pointer bg-green-600 hover:bg-green-700 text-white py-2 px-4"
								}
							>
								Create new model
							</button>
						</div>
						<div className="with-rows init-model">
							<div className="input-div with-rows">
								<InputGroup
									id="storedModelStatus"
									label="Model:"
									value={storedModelStatus}
									readonly={true}
								/>
							</div>
							<button
								onClick={deleteStoredModel}
								className={
									modelOptions.isDeleteStoredModelButtonDisabled
										? "bg-gray-600 disabled"
										: "cursor-pointer bg-red-600 hover:bg-red-700 text-white py-2 px-4"
								}
								disabled={modelOptions.isDeleteStoredModelButtonDisabled}
								type="button"
							>
								Delete stored model
							</button>
						</div>
					</div>
					<ModelOptions {...modelOptions} />
					<TrainAndTestSection
						modelOptions={modelOptions}
						gameStateService={gameStateService}
						policyNet={policyNet}
					/>
				</div>
			</section>
		</div>
	);
};

export default ReinforcementLearningComponent;
