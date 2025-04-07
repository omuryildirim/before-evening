import { useState } from "react";

export const useModelOptions = () => {
	const [maxStepsPerGame, setMaxStepsPerGame] = useState(3000);
	const [gamesPerIteration, setGamesPerIteration] = useState(100);
	const [discountRate, setDiscountRate] = useState(0.95);
	const [learningRate, setLearningRate] = useState(0.7);
	const [numberOfIterations, setNumberOfIterations] = useState("50");
	const [minEpsilon, setMinEpsilon] = useState(0.5);
	const [maxEpsilon, setMaxEpsilon] = useState(0.8);
	const [hiddenLayerSize, setHiddenLayerSize] = useState(1024);
	const [
		isDeleteStoredModelButtonDisabled,
		setIsDeleteStoredModelButtonDisabled,
	] = useState(true);
	const [isCreateModelButtonDisabled, setIsCreateModelButtonDisabled] =
		useState(false);
	const [isHiddenLayerSizeInputDisabled, setIsHiddenLayerSizeInputDisabled] =
		useState(false);
	const [isTrainButtonDisabled, setIsTrainButtonDisabled] = useState(true);
	const [isTestButtonDisabled, setIsTestButtonDisabled] = useState(true);
	const [lambda] = useState(0.01);

	return {
		maxStepsPerGame,
		setMaxStepsPerGame,
		gamesPerIteration,
		setGamesPerIteration,
		discountRate,
		setDiscountRate,
		learningRate,
		setLearningRate,
		numberOfIterations,
		setNumberOfIterations,
		minEpsilon,
		setMinEpsilon,
		maxEpsilon,
		setMaxEpsilon,
		hiddenLayerSize,
		setHiddenLayerSize,
		isDeleteStoredModelButtonDisabled,
		setIsDeleteStoredModelButtonDisabled,
		isCreateModelButtonDisabled,
		setIsCreateModelButtonDisabled,
		isHiddenLayerSizeInputDisabled,
		setIsHiddenLayerSizeInputDisabled,
		isTrainButtonDisabled,
		setIsTrainButtonDisabled,
		isTestButtonDisabled,
		setIsTestButtonDisabled,
		lambda,
	};
};
