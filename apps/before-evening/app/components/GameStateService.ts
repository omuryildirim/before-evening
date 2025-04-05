import { BeforeEveningGameEngine, KEY, StateUpdate } from '@before-evening/game-engine';
import { ActionList } from './reinforcement-learning/reinforcement-learning.types';

export function useGameStateService() {
  let stateUpdater: (state: StateUpdate) => void;
  let refreshGame: () => void;
  let stopTest: (stop: boolean) => void;
  let previousActions: number[] = [];
  let beforeEvening: BeforeEveningGameEngine;

  const associateStateUpdater = (stateUpdaterInstance: (state: StateUpdate) => void) => {
    stateUpdater = stateUpdaterInstance;
  };

  const dispatchAnAction = (action: ActionList) => {
    const keyList: number[] = [];

    switch (action) {
      case 'left':
        keyList.push(KEY.LEFT);
        break;
      case 'up':
        keyList.push(KEY.UP);
        break;
      case 'right':
        keyList.push(KEY.RIGHT);
        break;
      case 'down':
        keyList.push(KEY.DOWN);
        break;
      case 'left-up':
        keyList.push(KEY.LEFT, KEY.UP);
        break;
      case 'right-up':
        keyList.push(KEY.RIGHT, KEY.UP);
        break;
      case 'right-down':
        keyList.push(KEY.RIGHT, KEY.DOWN);
        break;
      case 'left-down':
        keyList.push(KEY.LEFT, KEY.DOWN);
        break;
    }

    if (previousActions) {
      for (const key of previousActions) {
        document.dispatchEvent(
          new KeyboardEvent('keyup', { keyCode: key } as any)
        );
      }
    }

    for (const key of keyList) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { keyCode: key } as any)
      );
    }

    console.log(action);

    previousActions = keyList;
  };

  return {
    setRefreshGameCallback: (callback: () => void) => { refreshGame = callback; },
    setStopTestCallback: (callback: (stop: boolean) => void) => { stopTest = callback; },
    stateUpdater,
    refreshGame,
    stopTest,
    beforeEvening,
    associateStateUpdater,
    dispatchAnAction,
  };
}
