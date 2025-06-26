import {
	Memory,
	type SaveablePolicyNetwork,
	trainModelForNumberOfGames,
} from "@before-evening/shared";
import * as tf from "@tensorflow/tfjs";
import { useCallback, useId, useState } from "react";
import type GameStateService from "~/components/GameStateService";
import { InputGroup } from "~/components/reinforcement-learning/InputGroup";
import { Orchestrator } from "~/components/reinforcement-learning/orchestrator";
import type { useModelOptions } from "./ModelOptions/useModelOptions";

interface Props {
	modelOptions: ReturnType<typeof useModelOptions>;
	policyNet: SaveablePolicyNetwork | undefined;
	gameStateService: GameStateService;
}

export const TrainAndTestSection = ({
	modelOptions,
	policyNet,
	gameStateService,
}: Props) => {
	const [trainButtonText, setTrainButtonText] = useState("Train");
	const [stopRequested, setStopRequested] = useState(false);
	const [iterationStatus, setIterationStatus] = useState("");
	const [iterationProgress, setIterationProgress] = useState(0);
	const [gameStatus, setGameStatus] = useState("");
	const [gameProgress, setGameProgress] = useState(0);
	const [renderDuringTraining, setRenderDuringTraining] = useState(true);
	const [testState, setTestState] = useState(false);
	const [trainingProgress, setTrainingProgress] = useState("");

	const renderDuringTrainingId = useId();
	const iterationProgressId = useId();
	const trainStatusId = useId();
	const gameProgressId = useId();
	const iterationStatusId = useId();
	const stepsContainerId = useId();

	const disableModelControls = useCallback(() => {
		setTrainButtonText("Stop");
		modelOptions.setIsTestButtonDisabled(true);
		modelOptions.setIsDeleteStoredModelButtonDisabled(true);
	}, [
		modelOptions.setIsDeleteStoredModelButtonDisabled,
		modelOptions.setIsTestButtonDisabled,
	]);

	const enableModelControls = useCallback(() => {
		setTrainButtonText("Train");
		modelOptions.setIsTestButtonDisabled(false);
		modelOptions.setIsDeleteStoredModelButtonDisabled(false);
	}, [
		modelOptions.setIsDeleteStoredModelButtonDisabled,
		modelOptions.setIsTestButtonDisabled,
	]);

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
		onGameEnd,
		stopRequested,
	]);

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
		disableModelControls,
		enableModelControls,
		gameStateService.beforeEvening,
		modelOptions.maxEpsilon,
		modelOptions.minEpsilon,
		onGameEnd,
		onIterationEnd,
		stopRequested,
		trainAndRender,
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
	}, [
		testState,
		policyNet,
		gameStateService,
		modelOptions.lambda,
		modelOptions.maxEpsilon,
		modelOptions.maxStepsPerGame,
		modelOptions.minEpsilon,
	]);

	const toggleSkipRender = useCallback(() => {
		if (gameStateService.beforeEvening) {
			gameStateService.beforeEvening.toggleSkipRender(renderDuringTraining);
			setRenderDuringTraining(!renderDuringTraining);
		}
	}, [renderDuringTraining, gameStateService]);

	return (
		<>
			<div className="input-div">
				<InputGroup
					id={renderDuringTrainingId}
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

			<section>
				<p className="section-head">Training Progress</p>
				<div className="with-rows">
					<div className="status">
						<label htmlFor={iterationProgressId} id={trainStatusId}>
							Iteration #: {iterationStatus}
						</label>
						<progress
							id={iterationProgressId}
							value={iterationProgress}
							max="100"
						/>
					</div>
					<div className="status">
						<label htmlFor={gameProgressId} id={iterationStatusId}>
							Game #: {gameStatus}
						</label>
						<progress id={gameProgressId} value={gameProgress} max="100" />
					</div>
					<div id={stepsContainerId} />
				</div>
			</section>
		</>
	);
};
