import React, { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Memory, SaveablePolicyNetwork, trainModelForNumberOfGames } from '@before-evening/shared';
import { LOCAL_STORAGE_MODEL_PATH, localStorageModelName, MODEL_SAVE_PATH, preTrainedModelName } from './constants';
import { Orchestrator } from './orchestrator';
import  GameStateService from '~/components/GameStateService';

interface Params {
  gameStateService: GameStateService;
}

const ReinforcementLearningComponent = ({ gameStateService}: Params) => {
  const [policyNet, setPolicyNet] = useState<SaveablePolicyNetwork | undefined>();
  const [hiddenLayerSize, setHiddenLayerSize] = useState(1024);
  const [maxStepsPerGame, setMaxStepsPerGame] = useState(3000);
  const [gamesPerIteration, setGamesPerIteration] = useState(100);
  const [discountRate, setDiscountRate] = useState(0.95);
  const [learningRate, setLearningRate] = useState(1);
  const [numberOfIterations, setNumberOfIterations] = useState('50');
  const [minEpsilon, setMinEpsilon] = useState(0.5);
  const [maxEpsilon, setMaxEpsilon] = useState(0.8);
  const [lambda] = useState(0.01);
  const [storedModelStatus, setStoredModelStatus] = useState('N/A');
  const [disabledStatus, setDisabledStatus] = useState({
    deleteStoredModelButton: true,
    createModelButton: false,
    hiddenLayerSizesInput: false,
    trainButton: true,
    testButton: true,
  });
  const [trainButtonText, setTrainButtonText] = useState('Train');
  const [_stopRequested, setStopRequested] = useState(false);
  const [iterationStatus, setIterationStatus] = useState('');
  const [iterationProgress, setIterationProgress] = useState(0);
  const [gameStatus, setGameStatus] = useState('');
  const [gameProgress, setGameProgress] = useState(0);
  const [renderDuringTraining, setRenderDuringTraining] = useState(true);
  const [modelNames, setModelNames] = useState([{ key: MODEL_SAVE_PATH, value: preTrainedModelName }]);
  const [testState, setTestState] = useState(false);
  const [_localStorageModel, setLocalStorageModel] = useState(false);
  const [modelSavePath, setModelSavePath] = useState(MODEL_SAVE_PATH);
  const [trainingProgress, setTrainingProgress] = useState("");

  useEffect(() => {
    const initializeView = async () => {
      const localStorageModelExists = await SaveablePolicyNetwork.checkStoredModelStatus(LOCAL_STORAGE_MODEL_PATH);
      if (localStorageModelExists) {
        setModelNames((prevModelNames) => [...prevModelNames, { key: LOCAL_STORAGE_MODEL_PATH, value: localStorageModelName }]);
        setLocalStorageModel(true);
      }
      setModelSavePath(localStorageModelExists ? LOCAL_STORAGE_MODEL_PATH : MODEL_SAVE_PATH);
    };
    initializeView();
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      const loadedPolicyNet = await SaveablePolicyNetwork.loadModel(maxStepsPerGame, modelSavePath, true);
      setPolicyNet(loadedPolicyNet);
      setHiddenLayerSize(loadedPolicyNet.hiddenLayerSizes() as number);
      updateUIControlState(loadedPolicyNet);
    };
    if (modelSavePath) {
      loadModel().then();
    }
  }, [modelSavePath]);

  const updateUIControlState = (policyNet: SaveablePolicyNetwork | undefined) => {
    if (!policyNet) {
      setStoredModelStatus('No stored model.');
      setDisabledStatus((prevStatus) => ({ ...prevStatus, deleteStoredModelButton: true }));
    } else {
      const isLocalStorageModel = modelSavePath !== MODEL_SAVE_PATH;
      setLocalStorageModel(isLocalStorageModel);
      setStoredModelStatus(isLocalStorageModel ? localStorageModelName : preTrainedModelName);
      setDisabledStatus({
        ...disabledStatus,
        deleteStoredModelButton: !isLocalStorageModel,
        createModelButton: isLocalStorageModel,
        hiddenLayerSizesInput: !!policyNet,
        trainButton: !policyNet || !isLocalStorageModel,
        testButton: !policyNet,
      });
    }
  };

  const createModel = async () => {
    try {
      setModelSavePath(LOCAL_STORAGE_MODEL_PATH);
      const newPolicyNet = new SaveablePolicyNetwork({
        hiddenLayerSizesOrModel: hiddenLayerSize,
        maxStepsPerGame: maxStepsPerGame,
        modelName: modelSavePath,
      });
      await newPolicyNet.saveModel();
      setPolicyNet(newPolicyNet);
      updateUIControlState(newPolicyNet);
      setModelNames((prevModelNames) => [...prevModelNames, { key: LOCAL_STORAGE_MODEL_PATH, value: localStorageModelName }]);
    } catch (err) {
      console.error(`ERROR: ${(err as Error).message}`);
    }
  };

  const deleteStoredModel = async () => {
    if (window.confirm('Are you sure you want to delete the locally-stored model?')) {
      await policyNet?.removeModel();
      setPolicyNet(undefined);
      setModelNames((prevModelNames) => prevModelNames.filter((model) => model.key !== LOCAL_STORAGE_MODEL_PATH));
      setModelSavePath(MODEL_SAVE_PATH);
      updateUIControlState(undefined);
    }
  };

  const train = async () => {
    if (trainButtonText === 'Stop') {
      setStopRequested(true);
    } else {
      disableModelControls();
      const trainIterations = parseInt(numberOfIterations, 10);
      if (!(trainIterations > 0)) throw new Error(`Invalid number of iterations: ${trainIterations}`);
      if (!(gamesPerIteration > 0)) throw new Error(`Invalid # of games per iterations: ${gamesPerIteration}`);
      if (!(maxStepsPerGame > 1)) throw new Error(`Invalid max. steps per game: ${maxStepsPerGame}`);
      if (!(discountRate > 0 && discountRate < 1)) throw new Error(`Invalid discount rate: ${discountRate}`);
      if (!(learningRate > 0 && learningRate < 1)) throw new Error(`Invalid learning rate: ${learningRate}`);

      onIterationEnd(0, trainIterations);
      setStopRequested(false);

      for (let i = 0; i < trainIterations; ++i) {
        if (renderDuringTraining) {
          await trainV2();
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
        updateUIControlState(policyNet);
      }

      enableModelControls();
    }
  };

  const test = () => {
    setTestState(!testState);
    if (testState) {
      testV2();
    } else {
      gameStateService.stopTest();
    }
  };

  const disableModelControls = () => {
    setTrainButtonText('Stop');
    setDisabledStatus((prevStatus) => ({
      ...prevStatus,
      testButton: true,
      deleteStoredModelButton: true,
    }));
  };

  const enableModelControls = () => {
    setTrainButtonText('Train');
    setDisabledStatus((prevStatus) => ({
      ...prevStatus,
      testButton: false,
      deleteStoredModelButton: false,
    }));
  };

  const onIterationEnd = (iterationCount: number, totalIterations: number) => {
    setIterationStatus(`Iteration ${iterationCount} of ${totalIterations}`);
    setIterationProgress((iterationCount / totalIterations) * 100);
  };

  const onGameEnd = (gameCount: number, totalGames: number) => {
    setGameStatus(`Game ${gameCount} of ${totalGames}`);
    setGameProgress((gameCount / totalGames) * 100);
    if (gameCount === totalGames) {
      setGameStatus('Updating weights...');
    }
  };

  const trainV2 = async () => {
    onGameEnd(0, gamesPerIteration);
    if (policyNet) {
      let memory = new Memory(maxStepsPerGame);
      for (let i = 0; i < gamesPerIteration; ++i) {
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
          setTrainingProgress
        );
        await orchestrator.run();
        onGameEnd(i + 1, gamesPerIteration);
        memory = new Memory(maxStepsPerGame);
      }
    }
  };

  const testV2 = () => {
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
      setTrainingProgress
    );
    orchestrator.test();
  };

  return (
    <div className="tfjs-example-container centered-container">
      <section className="title-area">
        <h1>TensorFlow.js: Reinforcement Learning</h1>
        <p className="subtitle">Train a model to make a car drive autonomously using reinforcement learning.</p>
      </section>

      <section>
        <p className="section-head">Instructions</p>
        <ul>
          <li>We have already trained a model for over 6 million iterations. You can't train this model more. Instead you can test this model and see how great it is! But you can also create a model that would be stored in your browser's localstorage. To do this:</li>
          <li>Choose a hidden layer size and click "Create Model".</li>
          <li>Select training parameters and then click "Train".</li>
          <li>Note that while the model is training it periodically saves a copy of itself to localstorage, this mean you can refresh the page and continue training from the last save point. If at any point you want to start training from scratch, click "Delete stored Model".</li>
          <li>Once the model has finished training you can click "Test" to see if your model can drive autonomously. You can also click 'Stop' to pause the training after the current iteration ends if you want to test the model sooner.</li>
          <li>You can watch the training. But this may take long due to fact that agent needs to be trained for couple of hundred thousand steps to learn basics of driving. Therefore, you can also select to train without rendering the training. We already set the recommended parameters for training. But you can play around and see the effects of parameters.</li>
        </ul>
      </section>

      <section>
        {modelNames.length > 1 && (
          <div>
            <p className="section-head">Selected model</p>
            <div>
              <select value={modelSavePath} onChange={(e) => setModelSavePath(e.target.value)}>
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
                <label className="input-label">Hidden layer size(s) (e.g.: "256", "32,64"):</label>
                <input
                  value={hiddenLayerSize}
                  onChange={(e) => setHiddenLayerSize(e.target.valueAsNumber)}
                  disabled={disabledStatus.hiddenLayerSizesInput}
                  type="number"
                />
              </div>
              <button onClick={createModel} disabled={disabledStatus.createModelButton}>
                Create model
              </button>
            </div>
            <div className="with-rows init-model">
              <div className="input-div with-rows">
                <label className="input-label">Model</label>
                <input value={storedModelStatus} disabled readOnly />
              </div>
              <button onClick={deleteStoredModel} disabled={disabledStatus.deleteStoredModelButton}>
                Delete stored model
              </button>
            </div>
          </div>

          <p className="section-head">Training Parameters</p>
          <div className="with-rows">
            <div className="input-div">
              <label className="input-label">Number of iterations:</label>
              <input value={numberOfIterations} onChange={(e) => setNumberOfIterations(e.target.value)} />
            </div>
            <div className="input-div">
              <label className="input-label">Games per iteration:</label>
              <input value={gamesPerIteration} onChange={(e) => setGamesPerIteration(e.target.valueAsNumber)} type="number" />
            </div>
            <div className="input-div">
              <label className="input-label">Max. steps per game:</label>
              <input value={maxStepsPerGame} onChange={(e) => setMaxStepsPerGame(e.target.valueAsNumber)} type="number" />
            </div>
            <div className="with-cols">
              <div className="input-div">
                <label className="input-label">Learning rate (<i>a</i>):</label>
                <input value={learningRate} onChange={(e) => setLearningRate(e.target.valueAsNumber)} type="number" />
              </div>
              <div className="input-div">
                <label className="input-label">Discount rate (<i>&gamma;</i>):</label>
                <input value={discountRate} onChange={(e) => setDiscountRate(e.target.valueAsNumber)} type="number" />
              </div>
            </div>
            <div className="with-cols">
              <div className="input-div">
                <label className="input-label">Min epsilon (<i>&epsilon;<sub>min</sub></i>):</label>
                <input value={minEpsilon} onChange={(e) => setMinEpsilon(e.target.valueAsNumber)} type="number" />
              </div>
              <div className="input-div">
                <label className="input-label">Max epsilon (<i>&epsilon;<sub>max</sub></i>):</label>
                <input value={maxEpsilon} onChange={(e) => setMaxEpsilon(e.target.valueAsNumber)} type="number" />
              </div>
            </div>
            <div className="input-div">
              <label className="input-label">Render during training:</label>
              <input
                type="checkbox"
                checked={renderDuringTraining}
                onChange={(e) => setRenderDuringTraining(e.target.checked)}
              />
              <span className="note">{trainingProgress || 'Uncheck me to speed up training'}</span>
            </div>

            <div className="buttons-section">
              <button onClick={train} disabled={disabledStatus.trainButton}>
                {trainButtonText}
              </button>
              <button onClick={test} disabled={disabledStatus.testButton}>
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
            <label id="train-status">Iteration #: {iterationStatus}</label>
            <progress value={iterationProgress} max="100"></progress>
          </div>
          <div className="status">
            <label id="iteration-status">Game #: {gameStatus}</label>
            <progress value={gameProgress} max="100"></progress>
          </div>
          <div id="stepsContainer"></div>
        </div>
      </section>
    </div>
  );
};

export default ReinforcementLearningComponent;
