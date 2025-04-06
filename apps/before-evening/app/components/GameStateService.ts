import { BeforeEveningGameEngine, KEY, StateUpdate } from '@before-evening/game-engine';
import { ActionList } from './reinforcement-learning/constants';

class GameStateService {
  private stateUpdater: (undefined | ((state: StateUpdate) => void))[];
  private previousActions: number[];
  public beforeEvening: BeforeEveningGameEngine;
  private refreshGameUpdater: (undefined | (() => void))[];
  private stopTestUpdater: (undefined | (() => void))[];

  constructor() {
    this.refreshGameUpdater = [];
    this.stopTestUpdater = [];
    this.beforeEvening = new BeforeEveningGameEngine();
    this.previousActions = [];
    this.stateUpdater = [];
  }

  public addStateUpdater(stateUpdater: (state: StateUpdate) => void) {
    this.stateUpdater.push(stateUpdater);
    return this.stateUpdater.length - 1;
  }

  public removeStateUpdater(index: number) {
    this.stateUpdater[index] = undefined;
  }

  public updateState(state: StateUpdate) {
    for (const updater of this.stateUpdater) {
      if (updater) {
        updater(state);
      }
    }
  }

  public dispatchAnAction(action: ActionList) {
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

    for (const key of this.previousActions) {
      document.dispatchEvent(
        new KeyboardEvent('keyup', { keyCode: key } as any)
      );
    }

    for (const key of keyList) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { keyCode: key } as any)
      );
    }

    console.log(action);

    this.previousActions = keyList;
  }

  public addRefreshGameUpdater(refreshGameUpdater: () => void) {
    this.refreshGameUpdater.push(refreshGameUpdater);
    return this.refreshGameUpdater.length - 1;
  }

  public removeRefreshGameUpdater(index: number) {
    this.refreshGameUpdater[index] = undefined;
  }

  public refreshGame() {
    for (const updater of this.refreshGameUpdater) {
      if (updater) {
        updater();
      }
    }
  }

  public addStopTestUpdater(stopTestUpdater: () => void) {
    this.stopTestUpdater.push(stopTestUpdater);
    return this.stopTestUpdater.length - 1;
  }

  public removeStopTestUpdater(index: number) {
    this.stopTestUpdater[index] = undefined;
  }

  public stopTest() {
    for (const updater of this.stopTestUpdater) {
      if (updater) {
        updater();
      }
    }
  }
}

export default GameStateService;
