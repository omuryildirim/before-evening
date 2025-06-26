import { SaveablePolicyNetwork } from "@before-evening/shared";
import { useCallback, useId } from "react";
import {
	LOCAL_STORAGE_MODEL_PATH,
	localStorageModelName,
	MODEL_SAVE_PATH,
} from "~/components/reinforcement-learning/constants";
import { InputGroup } from "~/components/reinforcement-learning/InputGroup";
import type { useModelOptions } from "~/components/reinforcement-learning/ModelOptions/useModelOptions";

interface Props {
	modelOptions: ReturnType<typeof useModelOptions>;
	policyNet: SaveablePolicyNetwork | undefined;
	setPolicyNet: (policyNet: SaveablePolicyNetwork | undefined) => void;
	setModelNames: (
		param: (
			prevModelNames: { key: string; value: string }[],
		) => { key: string; value: string }[],
	) => void;
	storedModelStatus: string;
	setStoredModelStatus: (status: string) => void;
	modelSavePath: string;
	setModelSavePath: (path: string) => void;
	setLocalStorageModel: (isLocalStorageModel: boolean) => void;
}

export const CreateAndDeleteModelSection = ({
	modelOptions,
	policyNet,
	setPolicyNet,
	setModelNames,
	storedModelStatus,
	setStoredModelStatus,
	setModelSavePath,
	setLocalStorageModel,
}: Props) => {
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
			modelOptions.setIsHiddenLayerSizeInputDisabled(!!newPolicyNet);
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
		modelOptions.setIsCreateModelButtonDisabled,
		modelOptions.setIsDeleteStoredModelButtonDisabled,
		modelOptions.setIsHiddenLayerSizeInputDisabled,
		modelOptions.setIsTestButtonDisabled,
		modelOptions.setIsTrainButtonDisabled,
		setLocalStorageModel,
		setModelNames,
		setModelSavePath,
		setPolicyNet,
		setStoredModelStatus,
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
	}, [
		policyNet,
		modelOptions.setIsDeleteStoredModelButtonDisabled,
		setModelNames,
		setModelSavePath,
		setPolicyNet,
		setStoredModelStatus,
	]);

	const hiddenLayerSizeId = useId();
	const storedModelId = useId();

	return (
		<>
			<p className="section-head">Initialize Model</p>
			<div className="with-cols">
				<div className="with-rows init-model">
					<div className="input-div with-rows">
						<InputGroup
							id={hiddenLayerSizeId}
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
							id={storedModelId}
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
		</>
	);
};
