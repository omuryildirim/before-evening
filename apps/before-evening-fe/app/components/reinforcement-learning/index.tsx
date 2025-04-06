import {
	Memory,
	SaveablePolicyNetwork,
	trainModelForNumberOfGames,
} from "@before-evening/shared";
import * as tf from "@tensorflow/tfjs";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import type GameStateService from "~/components/GameStateService";
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
	const [hiddenLayerSize, setHiddenLayerSize] = useState(1024);
	const [maxStepsPerGame, setMaxStepsPerGame] = useState(3000);
	const [gamesPerIteration, setGamesPerIteration] = useState(100);
	const [discountRate, setDiscountRate] = useState(0.95);
	const [learningRate, setLearningRate] = useState(0.7);
	const [numberOfIterations, setNumberOfIterations] = useState("50");
	const [minEpsilon, setMinEpsilon] = useState(0.5);
	const [maxEpsilon, setMaxEpsilon] = useState(0.8);
	const [lambda] = useState(0.01);
	const [storedModelStatus, setStoredModelStatus] = useState("N/A");
	const [disabledStatus, setDisabledStatus] = useState({
		deleteStoredModelButton: true,
		createModelButton: false,
		hiddenLayerSizesInput: false,
		trainButton: true,
		testButton: true,
	});
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
		setDisabledStatus({
			...disabledStatus,
			deleteStoredModelButton: !localStorageModelExists,
			createModelButton: !!localStorageModelExists,
		});
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
			setDisabledStatus({
				...disabledStatus,
				deleteStoredModelButton: !isLocalStorageModel,
				createModelButton: isLocalStorageModel,
				hiddenLayerSizesInput: isLocalStorageModel,
				trainButton: !isLocalStorageModel,
				testButton: false,
			});
		},
		[
			setLocalStorageModel,
			setStoredModelStatus,
			setDisabledStatus,
			disabledStatus,
		],
	);

	const loadModel = useCallback(async () => {
		const loadedPolicyNet = await SaveablePolicyNetwork.loadModel(
			maxStepsPerGame,
			modelSavePath,
			true,
		);
		setPolicyNet(loadedPolicyNet);
		setHiddenLayerSize(loadedPolicyNet.hiddenLayerSizes() as number);
		processModelDetails(modelSavePath);
	}, [maxStepsPerGame, modelSavePath]);

	useEffect(() => {
		if (modelSavePath) {
			loadModel().then();
		}
	}, [modelSavePath]);

	const createModel = useCallback(async () => {
		try {
			const newPolicyNet = new SaveablePolicyNetwork({
				hiddenLayerSizesOrModel: hiddenLayerSize,
				maxStepsPerGame: maxStepsPerGame,
				modelName: LOCAL_STORAGE_MODEL_PATH,
			});
			await newPolicyNet.saveModel();
			setModelSavePath(LOCAL_STORAGE_MODEL_PATH);
			setPolicyNet(newPolicyNet);
			setLocalStorageModel(true);
			setStoredModelStatus(localStorageModelName);
			setDisabledStatus({
				...disabledStatus,
				deleteStoredModelButton: false,
				createModelButton: true,
				hiddenLayerSizesInput: !!policyNet,
				trainButton: false,
				testButton: false,
			});
			setModelNames((prevModelNames) => [
				prevModelNames[0],
				{ key: LOCAL_STORAGE_MODEL_PATH, value: localStorageModelName },
			]);
		} catch (err) {
			console.error(`ERROR: ${(err as Error).message}`);
		}
	}, [hiddenLayerSize, maxStepsPerGame, modelSavePath]);

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
			setDisabledStatus((prevStatus) => ({
				...prevStatus,
				deleteStoredModelButton: true,
			}));
		}
	}, [policyNet]);

	const train = useCallback(async () => {
		if (trainButtonText === "Stop") {
			setStopRequested(true);
		} else {
			disableModelControls();
			const trainIterations = Number.parseInt(numberOfIterations, 10);
			if (!(trainIterations > 0))
				throw new Error(`Invalid number of iterations: ${trainIterations}`);
			if (!(gamesPerIteration > 0))
				throw new Error(
					`Invalid # of games per iterations: ${gamesPerIteration}`,
				);
			if (!(maxStepsPerGame > 1))
				throw new Error(`Invalid max. steps per game: ${maxStepsPerGame}`);
			if (!(discountRate > 0 && discountRate < 1))
				throw new Error(`Invalid discount rate: ${discountRate}`);
			if (!(learningRate > 0 && learningRate < 1))
				throw new Error(`Invalid learning rate: ${learningRate}`);

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
						maxEpsilon: maxEpsilon,
						minEpsilon: minEpsilon,
						discountRate: discountRate,
						learningRate: learningRate,
						gamesPerIteration: gamesPerIteration,
						maxStepsPerGame: maxStepsPerGame,
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
		numberOfIterations,
		gamesPerIteration,
		maxStepsPerGame,
		discountRate,
		learningRate,
		renderDuringTraining,
		policyNet,
	]);

	const test = useCallback(() => {
		setTestState(!testState);
		if (!testState) {
			if (!policyNet) return;
			const memory = new Memory(maxStepsPerGame);
			const orchestrator = new Orchestrator(
				policyNet,
				memory,
				0,
				0,
				0,
				gameStateService,
				maxEpsilon,
				minEpsilon,
				lambda,
				setTrainingProgress,
			);
			orchestrator.test();
		} else {
			gameStateService.stopTest();
		}
	}, [testState, policyNet]);

	const disableModelControls = useCallback(() => {
		setTrainButtonText("Stop");
		setDisabledStatus((prevStatus) => ({
			...prevStatus,
			testButton: true,
			deleteStoredModelButton: true,
		}));
	}, []);

	const enableModelControls = useCallback(() => {
		setTrainButtonText("Train");
		setDisabledStatus((prevStatus) => ({
			...prevStatus,
			testButton: false,
			deleteStoredModelButton: false,
		}));
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
		onGameEnd(0, gamesPerIteration);
		if (policyNet) {
			let memory = new Memory(maxStepsPerGame);
			for (let i = 0; i < gamesPerIteration; ++i) {
				if (stopRequested) {
					break;
				}

				gameStateService.refreshGame();
				const orchestrator = new Orchestrator(
					policyNet,
					memory,
					discountRate,
					learningRate,
					maxStepsPerGame,
					gameStateService,
					maxEpsilon,
					minEpsilon,
					lambda,
					setTrainingProgress,
				);
				await orchestrator.run();
				onGameEnd(i + 1, gamesPerIteration);
				memory = new Memory(maxStepsPerGame);
			}
		}
	}, [
		gamesPerIteration,
		policyNet,
		discountRate,
		learningRate,
		maxStepsPerGame,
		gameStateService,
		maxEpsilon,
		minEpsilon,
		lambda,
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
								<label htmlFor="hiddenLayerSize" className="input-label">
									Hidden layer size(s) (e.g.: "256", "64"):
								</label>
								<input
									id="hiddenLayerSize"
									className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
									value={hiddenLayerSize}
									onChange={(e) => setHiddenLayerSize(e.target.valueAsNumber)}
									disabled={disabledStatus.hiddenLayerSizesInput}
									type="number"
								/>
							</div>
							<button
								onClick={createModel}
								disabled={disabledStatus.createModelButton}
								type="button"
								className={
									disabledStatus.createModelButton
										? "bg-gray-600 disabled"
										: "cursor-pointer bg-green-600 hover:bg-green-700 text-white py-2 px-4"
								}
							>
								Create new model
							</button>
						</div>
						<div className="with-rows init-model">
							<div className="input-div with-rows">
								<label htmlFor="storedModelStatus" className="input-label">
									Model:
								</label>
								<input
									id="storedModelStatus"
									className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
									value={storedModelStatus}
									disabled
									readOnly
								/>
							</div>
							<button
								onClick={deleteStoredModel}
								className={
									disabledStatus.deleteStoredModelButton
										? "bg-gray-600 disabled"
										: "cursor-pointer bg-red-600 hover:bg-red-700 text-white py-2 px-4"
								}
								disabled={disabledStatus.deleteStoredModelButton}
								type="button"
							>
								Delete stored model
							</button>
						</div>
					</div>

					<p className="section-head">Training Parameters</p>
					<div className="with-rows">
						<div className="input-div">
							<label htmlFor="numberOfIterations" className="input-label">
								Number of iterations:
							</label>
							<input
								id="numberOfIterations"
								className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
								value={numberOfIterations}
								onChange={(e) => setNumberOfIterations(e.target.value)}
							/>
						</div>
						<div className="input-div">
							<label htmlFor="gamesPerIteration" className="input-label">
								Games per iteration:
							</label>
							<input
								id="gamesPerIteration"
								className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
								value={gamesPerIteration}
								onChange={(e) => setGamesPerIteration(e.target.valueAsNumber)}
								type="number"
							/>
						</div>
						<div className="input-div">
							<label htmlFor="maxStepsPerGame" className="input-label">
								Max. steps per game:
							</label>
							<input
								id="maxStepsPerGame"
								className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
								value={maxStepsPerGame}
								onChange={(e) => setMaxStepsPerGame(e.target.valueAsNumber)}
								type="number"
							/>
						</div>
						<div className="with-cols">
							<div className="input-div">
								<label htmlFor="learningRate" className="input-label">
									Learning rate (<i>a</i>):
								</label>
								<input
									id="learningRate"
									className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
									value={learningRate}
									onChange={(e) => setLearningRate(e.target.valueAsNumber)}
									type="number"
								/>
							</div>
							<div className="input-div">
								<label htmlFor="discountRate" className="input-label">
									Discount rate (<i>&gamma;</i>):
								</label>
								<input
									id="discountRate"
									className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
									value={discountRate}
									onChange={(e) => setDiscountRate(e.target.valueAsNumber)}
									type="number"
								/>
							</div>
						</div>
						<div className="with-cols">
							<div className="input-div">
								<label htmlFor="minEpsilon" className="input-label">
									Min epsilon (
									<i>
										&epsilon;<sub>min</sub>
									</i>
									):
								</label>
								<input
									id="minEpsilon"
									className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
									value={minEpsilon}
									onChange={(e) => setMinEpsilon(e.target.valueAsNumber)}
									type="number"
								/>
							</div>
							<div className="input-div">
								<label htmlFor="maxEpsilon" className="input-label">
									Max epsilon (
									<i>
										&epsilon;<sub>max</sub>
									</i>
									):
								</label>
								<input
									id="maxEpsilon"
									className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
									value={maxEpsilon}
									onChange={(e) => setMaxEpsilon(e.target.valueAsNumber)}
									type="number"
								/>
							</div>
						</div>
						<div className="input-div">
							<label htmlFor="renderDuringTraining" className="input-label">
								Render during training:
							</label>
							<input
								id="renderDuringTraining"
								type="checkbox"
								checked={renderDuringTraining}
								onChange={() => toggleSkipRender()}
							/>
							<span className="note">
								{trainingProgress || "Uncheck me to speed up training"}
							</span>
						</div>

						<div className="buttons-section">
							<button
								onClick={train}
								disabled={disabledStatus.trainButton}
								type="button"
								className={
									disabledStatus.trainButton
										? "bg-gray-600 disabled"
										: "cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4"
								}
							>
								{trainButtonText}
							</button>
							<button
								onClick={test}
								disabled={disabledStatus.testButton}
								type="button"
								className={
									disabledStatus.testButton
										? "bg-gray-600 disabled"
										: "cursor-pointer bg-blue-700 hover:bg-blue-800 text-white py-2 px-4"
								}
							>
								Test
							</button>
						</div>
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
