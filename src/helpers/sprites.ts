import { SPRITES } from '../constants/sprites.constants';
import { Segment } from '../interfaces/segment.interface';
import { Sprite } from '../interfaces/sprite.interface';
import { Utils } from '../lib/utils';

export const addSprite = (segments: Segment[], index: number, sprite: Sprite, offset: number) => {
  segments[index].sprites.push({ source: sprite, offset: offset });
};

export const resetSprites = (segments: Segment[]) => {
  let n, i;

  addSprite(segments, 20, SPRITES.BILLBOARD07, -1);
  addSprite(segments, 40, SPRITES.BILLBOARD06, -1);
  addSprite(segments, 60, SPRITES.BILLBOARD08, -1);
  addSprite(segments, 80, SPRITES.BILLBOARD09, -1);
  addSprite(segments, 100, SPRITES.BILLBOARD01, -1);
  addSprite(segments, 120, SPRITES.BILLBOARD02, -1);
  addSprite(segments, 140, SPRITES.BILLBOARD03, -1);
  addSprite(segments, 160, SPRITES.BILLBOARD04, -1);
  addSprite(segments, 180, SPRITES.BILLBOARD05, -1);

  addSprite(segments, 240, SPRITES.BILLBOARD07, -1.2);
  addSprite(segments, 240, SPRITES.BILLBOARD06, 1.2);
  addSprite(segments, segments.length - 25, SPRITES.BILLBOARD07, -1.2);
  addSprite(segments, segments.length - 25, SPRITES.BILLBOARD06, 1.2);

  for (n = 10; n < 200; n += 4 + Math.floor(n / 100)) {
    addSprite(segments, n, SPRITES.PALM_TREE, 0.5 + Math.random() * 0.5);
    addSprite(segments, n, SPRITES.PALM_TREE, 1 + Math.random() * 2);
  }

  for (n = 250; n < 1000; n += 5) {
    addSprite(segments, n, SPRITES.COLUMN, 1.1);
    addSprite(segments, n + Utils.randomInt(0, 5), SPRITES.TREE1, -1 - Math.random() * 2);
    addSprite(segments, n + Utils.randomInt(0, 5), SPRITES.TREE2, -1 - Math.random() * 2);
  }

  for (n = 200; n < segments.length; n += 3) {
    addSprite(
      segments,
      n,
      Utils.randomChoice(SPRITES.PLANTS),
      Utils.randomChoice([1, -1]) * (2 + Math.random() * 5)
    );
  }

  let side, sprite, offset;
  for (n = 1000; n < segments.length - 50; n += 100) {
    side = Utils.randomChoice([1, -1]);
    addSprite(segments, n + Utils.randomInt(0, 50), Utils.randomChoice(SPRITES.BILLBOARDS), -side);
    for (i = 0; i < 20; i++) {
      sprite = Utils.randomChoice(SPRITES.PLANTS);
      offset = side * (1.5 + Math.random());
      addSprite(segments, n + Utils.randomInt(0, 50), sprite, offset);
    }
  }
};
