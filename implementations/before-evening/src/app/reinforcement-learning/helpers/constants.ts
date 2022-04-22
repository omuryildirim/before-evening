import {MODEL_VERSION} from "../../../../../shared/constants";

// The IndexedDB path where the model of the policy network will be saved.
export const MODEL_SAVE_PATH = '../../../assets/' + MODEL_VERSION + '/model.json';
export const LOCAL_STORAGE_MODEL_PATH = 'localstorage://' + MODEL_VERSION;

export const localStorageModelName = 'Local storage model';
export const preTrainedModelName = 'Pre-trained model';
