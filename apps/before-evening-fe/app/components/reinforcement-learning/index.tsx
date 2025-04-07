import {
	Memory,
	SaveablePolicyNetwork,
	trainModelForNumberOfGames,
} from "@before-evening/shared";
import * as tf from "@tensorflow/tfjs";
import React, { useState, useEffect, useCallback } from "react";
import type GameStateService from "~/components/GameStateService";
import { InputGroup } from "~/components/reinforcement-learning/InputGroup";
import { ModelOptions } from "~/components/reinforcement-learning/ModelOptions";
import { useModelOptions } from "~/components/reinforcement-learning/ModelOptions/useModelOptions";
import {
	LOCAL_STORAGE_MODEL_PATH,
	MODEL_SAVE_PATH,
	localStorageModelName,
	preTrainedModelName,
} from "./constants";
import { Orchestrator } from "./orchestrator";

interface Params {
	gameStateService: GameStateService;
}

const ReinforcementLearningComponent = ({ gameStateService }: Params) => {
	const [policyNet, setPolicyNet] = useState<
		SaveablePolicyNetwork | undefined
	>();

	const modelOptions = useModelOptions();

	const [storedModelStatus, setStoredModelStatus] = useState("N/A");
	const [trainButtonText, setTrainButtonText] = useState("Train");
	const [stopRequested, setStopRequested] = useState(false);
	const [iterationStatus, setIterationStatus] = useState("");
	const [iterationProgress, setIterationProgress] = useState(0);
	const [gameStatus, setGameStatus] = useState("");
	const [gameProgress, setGameProgress] = useState(0);
	const [renderDuringTraining, setRenderDuringTraining] = useState(true);
	const [modelNames, setModelNames] = useState([
		{ key: MODEL_SAVE_PATH, value: preTrainedModelName },
	]);
	const [testState, setTestState] = useState(false);
	const [_localStorageModel, setLocalStorageModel] = useState(false);
	const [modelSavePath, setModelSavePath] = useState("");
	const [trainingProgress, setTrainingProgress] = useState("");

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

	const train = useCallback(async () => {
		if (trainButtonText === "Stop") {
			setStopRequested(true);
		} else {
			disableModelControls();
			const trainIterations = Number.parseInt(
				modelOptions.numberOfIterations,
				10,
			);
			if (!(trainIterations > 0))
				throw new Error(`Invalid number of iterations: ${trainIterations}`);
			if (!(modelOptions.gamesPerIteration > 0))
				throw new Error(
					`Invalid # of games per iterations: ${modelOptions.gamesPerIteration}`,
				);
			if (!(modelOptions.maxStepsPerGame > 1))
				throw new Error(
					`Invalid max. steps per game: ${modelOptions.maxStepsPerGame}`,
				);
			if (!(modelOptions.discountRate > 0 && modelOptions.discountRate < 1))
				throw new Error(`Invalid discount rate: ${modelOptions.discountRate}`);
			if (!(modelOptions.learningRate > 0 && modelOptions.learningRate < 1))
				throw new Error(`Invalid learning rate: ${modelOptions.learningRate}`);

			onIterationEnd(0, trainIterations);
			setStopRequested(false);

			for (let i = 0; i < trainIterations; ++i) {
				if (renderDuringTraining) {
					await trainAndRender();
					if (stopRequested) {
						setStopRequested(false);
						setTrainButtonText("Train");
						break;
					}
				} else if (policyNet) {
					await trainModelForNumberOfGames({
						maxEpsilon: modelOptions.maxEpsilon,
						minEpsilon: modelOptions.minEpsilon,
						discountRate: modelOptions.discountRate,
						learningRate: modelOptions.learningRate,
						gamesPerIteration: modelOptions.gamesPerIteration,
						maxStepsPerGame: modelOptions.maxStepsPerGame,
						beforeEvening: gameStateService.beforeEvening,
						policyNet: policyNet,
						onGameEnd: onGameEnd,
					});
				}
				onIterationEnd(i + 1, trainIterations);
				await tf.nextFrame(); // Unblock UI thread.
				await policyNet?.saveModel();
				processModelDetails(modelSavePath);
			}

			enableModelControls();
		}
	}, [
		trainButtonText,
		modelOptions.numberOfIterations,
		modelOptions.gamesPerIteration,
		modelOptions.maxStepsPerGame,
		modelOptions.discountRate,
		modelOptions.learningRate,
		renderDuringTraining,
		policyNet,
	]);

	const test = useCallback(() => {
		setTestState(!testState);
		if (!testState) {
			if (!policyNet) return;
			const memory = new Memory(modelOptions.maxStepsPerGame);
			const orchestrator = new Orchestrator(
				policyNet,
				memory,
				0,
				0,
				0,
				gameStateService,
				modelOptions.maxEpsilon,
				modelOptions.minEpsilon,
				modelOptions.lambda,
				setTrainingProgress,
			);
			orchestrator.test();
		} else {
			gameStateService.stopTest();
		}
	}, [testState, policyNet]);

	const disableModelControls = useCallback(() => {
		setTrainButtonText("Stop");
		modelOptions.setIsTestButtonDisabled(true);
		modelOptions.setIsDeleteStoredModelButtonDisabled(true);
	}, []);

	const enableModelControls = useCallback(() => {
		setTrainButtonText("Train");
		modelOptions.setIsTestButtonDisabled(false);
		modelOptions.setIsDeleteStoredModelButtonDisabled(false);
	}, []);

	const onIterationEnd = useCallback(
		(iterationCount: number, totalIterations: number) => {
			setIterationStatus(`Iteration ${iterationCount} of ${totalIterations}`);
			setIterationProgress((iterationCount / totalIterations) * 100);
		},
		[],
	);

	const onGameEnd = useCallback((gameCount: number, totalGames: number) => {
		setGameStatus(`Game ${gameCount} of ${totalGames}`);
		setGameProgress((gameCount / totalGames) * 100);
		if (gameCount === totalGames) {
			setGameStatus("Updating weights...");
		}
	}, []);

	const trainAndRender = useCallback(async () => {
		onGameEnd(0, modelOptions.gamesPerIteration);
		if (policyNet) {
			let memory = new Memory(modelOptions.maxStepsPerGame);
			for (let i = 0; i < modelOptions.gamesPerIteration; ++i) {
				if (stopRequested) {
					break;
				}

				gameStateService.refreshGame();
				const orchestrator = new Orchestrator(
					policyNet,
					memory,
					modelOptions.discountRate,
					modelOptions.learningRate,
					modelOptions.maxStepsPerGame,
					gameStateService,
					modelOptions.maxEpsilon,
					modelOptions.minEpsilon,
					modelOptions.lambda,
					setTrainingProgress,
				);
				await orchestrator.run();
				onGameEnd(i + 1, modelOptions.gamesPerIteration);
				memory = new Memory(modelOptions.maxStepsPerGame);
			}
		}
	}, [
		modelOptions.gamesPerIteration,
		policyNet,
		modelOptions.discountRate,
		modelOptions.learningRate,
		modelOptions.maxStepsPerGame,
		gameStateService,
		modelOptions.maxEpsilon,
		modelOptions.minEpsilon,
		modelOptions.lambda,
	]);

	const toggleSkipRender = useCallback(() => {
		if (gameStateService.beforeEvening) {
			gameStateService.beforeEvening.toggleSkipRender(renderDuringTraining);
			setRenderDuringTraining(!renderDuringTraining);
		}
	}, [renderDuringTraining, gameStateService]);

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
					<div className="input-div">
						<InputGroup
							id="renderDuringTraining"
							label="Render during training"
							value={renderDuringTraining ? "Yes" : "No"}
							onChange={() => toggleSkipRender()}
							type="checkbox"
						/>
						<div className="note mb-6">
							{trainingProgress || "Uncheck me to speed up training"}
						</div>
					</div>

					<div className="buttons-section">
						<button
							onClick={train}
							disabled={modelOptions.isTrainButtonDisabled}
							type="button"
							className={
								modelOptions.isTrainButtonDisabled
									? "bg-gray-600 disabled"
									: "cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4"
							}
						>
							{trainButtonText}
						</button>
						<button
							onClick={test}
							disabled={modelOptions.isTestButtonDisabled}
							type="button"
							className={
								modelOptions.isTestButtonDisabled
									? "bg-gray-600 disabled"
									: "cursor-pointer bg-blue-700 hover:bg-blue-800 text-white py-2 px-4"
							}
						>
							Test
						</button>
					</div>
				</div>
			</section>

			<section>
				<p className="section-head">Training Progress</p>
				<div className="with-rows">
					<div className="status">
						<label htmlFor="iterationProgress" id="train-status">
							Iteration #: {iterationStatus}
						</label>
						<progress
							id="iterationProgress"
							value={iterationProgress}
							max="100"
						/>
					</div>
					<div className="status">
						<label htmlFor="gameProgress" id="iteration-status">
							Game #: {gameStatus}
						</label>
						<progress id="gameProgress" value={gameProgress} max="100" />
					</div>
					<div id="stepsContainer" />
				</div>
			</section>
		</div>
	);
};

export default ReinforcementLearningComponent;
