import { MODEL_VERSION } from '@before-evening/shared';

// The IndexedDB path where the model of the policy network will be saved.
export const MODEL_SAVE_PATH =
  '/assets/' + MODEL_VERSION + '/model.json';
export const LOCAL_STORAGE_MODEL_PATH = 'localstorage://' + MODEL_VERSION;

export const localStorageModelName = 'Local storage model';
export const preTrainedModelName = 'Pre-trained model';

export type ActionList =
  | 'left'
  | 'up'
  | 'right'
  | 'down'
  | 'left-up'
  | 'right-up'
  | 'right-down'
  | 'left-down';

export const ActionMap: Record<string, ActionList> = {
  '-1': 'up',
  '0': 'left',
  1: 'right',
  2: 'down',
  3: 'left-up',
  4: 'right-up',
  5: 'right-down',
  6: 'left-down',
};
