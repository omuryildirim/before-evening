/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/**
 * TensorFlow.js Reinforcement Learning Example: Balancing a Cart-Pole System.
 *
 * The simulation, training, testing and visualization parts are written
 * purely in JavaScript and can run in the web browser with WebGL acceleration.
 *
 * This reinforcement learning (RL) problem was proposed in:
 *
 * - Barto, Sutton, and Anderson, "Neuronlike Adaptive Elements That Can Solve
 *   Difficult Learning Control Problems," IEEE Trans. Syst., Man, Cybern.,
 *   Vol. SMC-13, pp. 834--846, Sept.--Oct. 1983
 * - Sutton, "Temporal Aspects of Credit Assignment in Reinforcement Learning",
 *   Ph.D. Dissertation, Department of Computer and Information Science,
 *   University of Massachusetts, Amherst, 1984.
 *
 * It later became one of OpenAI's gym environmnets:
 *   https://github.com/openai/gym/blob/master/gym/envs/classic_control/cartpole.py
 */

import * as tf from '@tensorflow/tfjs-node';

import { ReinforcementLearningModel } from './reinforcement-learning.model';
import * as fs from 'fs';
import path from 'path';

/**
 * Policy network for controlling the cart-pole system.
 *
 * The role of the policy network is to select an action based on the observed
 * state of the system. In this case, the action is the leftward or rightward
 * force and the observed system state is a four-dimensional vector, consisting
 * of cart position, cart velocity, pole angle and pole angular velocity.
 *
 */
class PolicyNetwork {
  model: ReinforcementLearningModel;

  /**
   * Constructor of PolicyNetwork.
   *
   * @param hiddenLayerSizesOrModel
   *   Can be any of the following
   *   - Size of the hidden layer, as a single number (for a single hidden
   *     layer)
   *   - An Array of numbers (for any number of hidden layers).
   *   - An instance of tf.LayersModel.
   * @param maxStepsPerGame
   */
  constructor(hiddenLayerSizesOrModel: number | tf.LayersModel, maxStepsPerGame: number) {
    this.model = new ReinforcementLearningModel(hiddenLayerSizesOrModel, 7, 7, maxStepsPerGame)
  }
}

// The IndexedDB path where the model of the policy network will be saved.
const MODEL_VERSION = 'before-evening-v5';
const MODEL_SAVE_PATH_ = 'file://./' + MODEL_VERSION;

/**
 * A subclass of PolicyNetwork that supports saving and loading.
 */
export class SaveablePolicyNetwork extends PolicyNetwork {
  /**
   * Constructor of SaveablePolicyNetwork
   *
   * @param {number | number[]} hiddenLayerSizesOrModel
   * @param maxStepsPerGame
   */
  constructor(hiddenLayerSizesOrModel: number | tf.LayersModel, maxStepsPerGame: number) {
    super(hiddenLayerSizesOrModel, maxStepsPerGame);
  }

  /**
   * Save the model to IndexedDB.
   */
  async saveModel() {
    return await this.model.network.save(MODEL_SAVE_PATH_);
  }

  /**
   * Load the model fom IndexedDB.
   *
   * @returns {SaveablePolicyNetwork} The instance of loaded
   *   `SaveablePolicyNetwork`.
   * @throws {Error} If no model can be found in IndexedDB.
   */
  static async loadModel(maxStepsPerGame: number) {
    const handler = tf.io.fileSystem('./before-evening-v3');
    if (handler) {
      console.log(`Loading existing model...`);
      const model = await tf.loadLayersModel(MODEL_SAVE_PATH_ + '/model.json');
      console.log(`Loaded model from ${MODEL_SAVE_PATH_}`);
      return new SaveablePolicyNetwork(model, maxStepsPerGame);
    } else {
      throw new Error(`Cannot find model at ${MODEL_SAVE_PATH_}.`);
    }
  }

  /**
   * Check the status of locally saved model.
   *
   * @returns If the locally saved model exists, the model info as a JSON
   *   object. Else, `undefined`.
   */
  static async checkStoredModelStatus() {
    return fs.existsSync(path.resolve('./' + MODEL_VERSION + '/model.json'));
  }

  /**
   * Remove the locally saved model from IndexedDB.
   */
  async removeModel() {
    return await tf.io.removeModel(MODEL_SAVE_PATH_);
  }

  /**
   * Get the sizes of the hidden layers.
   *
   * @returns {number | number[]} If the model has only one hidden layer,
   *   return the size of the layer as a single number. If the model has
   *   multiple hidden layers, return the sizes as an Array of numbers.
   */
  hiddenLayerSizes() {
    const sizes = [];
    for (let i = 0; i < this.model.network.layers.length - 1; ++i) {
      sizes.push((<any>this.model.network.layers[i]).units);
    }
    return sizes.length === 1 ? sizes[0] : sizes;
  }
}
