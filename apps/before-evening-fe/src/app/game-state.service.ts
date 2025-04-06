import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { BeforeEveningGameEngine, KEY, StateUpdate } from '@before-evening/game-engine';

import { ActionList } from './reinforcement-learning/reinforcement-learning.types';

@Injectable()
export class GameStateService {
  public stateUpdater: Subject<StateUpdate>;
  public refreshGame: Subject<null>;
  private previousActions: number[];
  public stopTest: Subject<boolean>;
  public beforeEvening: BeforeEveningGameEngine;

  constructor() {
    this.refreshGame = new Subject<null>();
    this.stopTest = new Subject<null>();
  }

  public associateStateUpdater(stateUpdater: any) {
    this.stateUpdater = stateUpdater;
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

    if (this.previousActions) {
      for (const key of this.previousActions) {
        document.dispatchEvent(
          new KeyboardEvent('keyup', { keyCode: key })
        );
      }
    }

    for (const key of keyList) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { keyCode: key })
      );
    }

    console.log(action);

    this.previousActions = keyList;
  }
}
