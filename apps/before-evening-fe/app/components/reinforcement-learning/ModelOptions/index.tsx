import { useId } from "react";
import { InputGroup } from "~/components/reinforcement-learning/InputGroup";

interface Props {
	numberOfIterations: string;
	setNumberOfIterations: (value: string) => void;
	gamesPerIteration: number;
	setGamesPerIteration: (value: number) => void;
	maxStepsPerGame: number;
	setMaxStepsPerGame: (value: number) => void;
	discountRate: number;
	setDiscountRate: (value: number) => void;
	learningRate: number;
	setLearningRate: (value: number) => void;
	minEpsilon: number;
	setMinEpsilon: (value: number) => void;
	maxEpsilon: number;
	setMaxEpsilon: (value: number) => void;
}

export const ModelOptions = ({
	numberOfIterations,
	setNumberOfIterations,
	gamesPerIteration,
	setGamesPerIteration,
	maxStepsPerGame,
	setMaxStepsPerGame,
	discountRate,
	setDiscountRate,
	learningRate,
	setLearningRate,
	minEpsilon,
	setMinEpsilon,
	maxEpsilon,
	setMaxEpsilon,
}: Props) => {
	const numberOfIterationsId = useId();
	const gamesPerIterationId = useId();
	const maxStepsPerGameId = useId();
	const learningRateId = useId();
	const discountRateId = useId();
	const minEpsilonId = useId();
	const maxEpsilonId = useId();

	return (
		<>
			<p className="section-head">Training Parameters</p>
			<div className="with-rows">
				<div className="input-div">
					<InputGroup
						id={numberOfIterationsId}
						label="Number of iterations"
						value={numberOfIterations}
						onChange={(e) => setNumberOfIterations(e.target.value)}
					/>
				</div>
				<div className="input-div">
					<InputGroup
						id={gamesPerIterationId}
						label="Games per iteration"
						value={gamesPerIteration}
						onChange={(e) => setGamesPerIteration(e.target.valueAsNumber)}
					/>
				</div>
				<InputGroup
					id={maxStepsPerGameId}
					label="Max. steps per game"
					value={maxStepsPerGame}
					onChange={(e) => setMaxStepsPerGame(e.target.valueAsNumber)}
				/>
			</div>
			<div className="with-cols">
				<div className="input-div">
					<InputGroup
						id={learningRateId}
						label="Learning rate"
						value={learningRate}
						onChange={(e) => setLearningRate(e.target.valueAsNumber)}
					/>
				</div>
				<div className="input-div">
					<InputGroup
						id={discountRateId}
						label="Discount rate"
						value={discountRate}
						onChange={(e) => setDiscountRate(e.target.valueAsNumber)}
					/>
				</div>
			</div>
			<div className="with-cols">
				<div className="input-div">
					<InputGroup
						id={minEpsilonId}
						label={
							<>
								Min epsilon (
								<i>
									&epsilon;<sub>min</sub>
								</i>
								)
							</>
						}
						value={minEpsilon}
						onChange={(e) => setMinEpsilon(e.target.valueAsNumber)}
						type="number"
					/>
				</div>
				<div className="input-div">
					<InputGroup
						id={maxEpsilonId}
						label={
							<>
								Max epsilon (
								<i>
									&epsilon;<sub>max</sub>
								</i>
								)
							</>
						}
						value={maxEpsilon}
						onChange={(e) => setMaxEpsilon(e.target.valueAsNumber)}
						type="number"
					/>
				</div>
			</div>
		</>
	);
};
