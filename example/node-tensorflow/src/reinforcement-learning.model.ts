import * as tf from '@tensorflow/tfjs';

export interface StateUpdate {
  playerX: number;
  speed: number;
  next5Curve: [number, number, number, number, number];
}

export class ReinforcementLearningModel {
  public numStates: number;
  public numActions: number;
  public batchSize: number;
  public network: tf.Sequential | tf.LayersModel;

  /**
   * @param hiddenLayerSizesOrModel
   * @param {number} numStates
   * @param {number} numActions
   * @param {number} batchSize
   */
  constructor(hiddenLayerSizesOrModel: number | tf.LayersModel, numStates: number, numActions: number, batchSize: number) {
    this.numStates = numStates;
    this.numActions = numActions;
    this.batchSize = batchSize;

    if (hiddenLayerSizesOrModel instanceof tf.LayersModel) {
      this.network = hiddenLayerSizesOrModel;
      this.network.summary();
      this.network.compile({optimizer: 'adam', loss: 'meanSquaredError'});
    } else {
      this.defineModel(hiddenLayerSizesOrModel);
    }
  }

  defineModel(hiddenLayerSizes) {

    if (!Array.isArray(hiddenLayerSizes)) {
      hiddenLayerSizes = [hiddenLayerSizes];
    }
    this.network = tf.sequential();
    hiddenLayerSizes.forEach((hiddenLayerSize, i) => {
      (this.network as tf.Sequential).add(tf.layers.dense({
        units: hiddenLayerSize,
        activation: 'relu',
        // `inputShape` is required only for the first layer.
        inputShape: i === 0 ? [this.numStates] : undefined
      }));
    });
    (this.network as tf.Sequential).add(tf.layers.dense({units: this.numActions}));

    this.network.summary();
    this.network.compile({optimizer: 'adam', loss: 'meanSquaredError'});
  }

  /**
   * @param {tf.Tensor | tf.Tensor[]} states
   * @returns {tf.Tensor | tf.Tensor} The predictions of the best actions
   */
  public predict(states: tf.Tensor) {
    if (states.isDisposed) {
      console.log(states);
      return null;
    } else {
      return tf.tidy(() => this.network.predict(states as any) as any);
    }
  }

  /**
   * @param {tf.Tensor[]} xBatch
   * @param {tf.Tensor[]} yBatch
   */
  async train(xBatch, yBatch) {
    await this.network.fit(xBatch, yBatch);
  }

  /**
   * @param state
   * @param eps
   * @returns {number} The action chosen by the model (-1 : 6)
   */
  chooseAction(state: tf.Tensor2D, eps: number) {
    if (Math.random() < eps) {
      return Math.floor(Math.random() * this.numActions) - 1;
    } else {
      return tf.tidy(() => {
        const logits: any = this.network.predict(state as any);
        const sigmoid = tf.sigmoid(logits);
        const probs: any = tf.div(sigmoid, tf.sum(sigmoid));
        return tf.multinomial(probs, 1).dataSync()[0] - 1;
      });
    }
  }

  public static getState(state: StateUpdate): tf.Tensor2D {
    return tf.tensor2d([[state.playerX, ...state.next5Curve, state.speed]]);
  }
}