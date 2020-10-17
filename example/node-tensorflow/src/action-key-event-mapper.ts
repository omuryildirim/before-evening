export type ActionNameList =
  'left'
  | 'up'
  | 'right'
  | 'down'
  | 'left-up'
  | 'right-up'
  | 'right-down'
  | 'left-down';

export enum KeyboardEventKey {
  LEFT = 37,
  UP = 38,
  RIGHT = 39,
  DOWN = 40,
  A = 65,
  D = 68,
  S = 83,
  W = 87
}

export const ActionKeyToEventName = {
  '-1': 'left',
  '0': 'up',
  '1': 'right',
  '2': 'down',
  '3': 'left-up',
  '4': 'right-up',
  '5': 'right-down',
  '6': 'left-down'
};

const ActionKeyToKeyboardEventKey = {
  '-1': [KeyboardEventKey.LEFT],
  '0': [KeyboardEventKey.UP],
  '1': [KeyboardEventKey.RIGHT],
  '2': [KeyboardEventKey.DOWN],
  '3': [KeyboardEventKey.LEFT, KeyboardEventKey.UP],
  '4': [KeyboardEventKey.RIGHT, KeyboardEventKey.UP],
  '5': [KeyboardEventKey.RIGHT, KeyboardEventKey.DOWN],
  '6': [KeyboardEventKey.LEFT, KeyboardEventKey.DOWN]
};

export class ActionKeyEventMapper {
  public static convertActionToKeyboardKeyNumber(action: number): number[] {
    return ActionKeyToKeyboardEventKey[action];
  }
}
