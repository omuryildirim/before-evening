import { COLORS } from '../constants/colors.constant';
import { SPRITES } from '../constants/sprites.constants';
import { CameraAxis, PlayerScreen } from '../interfaces/segment.interface';
import { Sprite } from '../interfaces/sprite.interface';
import { Utils } from '../lib/utils';

import { Render } from './render';
import { StateService } from './state.service';

const ROAD = {
  LENGTH: { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 },
  HILL: { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 },
  CURVE: { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 },
};

export class RoadHelper {
  constructor(private state: StateService) {}

  private lastY() {
    return this.state.segments.length == 0
      ? 0
      : this.state.segments[this.state.segments.length - 1].p2.world.y;
  }

  private addSegment(curve: number, y: number) {
    const n = this.state.segments.length;
    this.state.segments.push({
      index: n,
      p1: {
        world: { y: this.lastY(), z: n * this.state.segmentLength },
        camera: {} as CameraAxis,
        screen: {} as PlayerScreen,
      },
      p2: {
        world: { y: y, z: (n + 1) * this.state.segmentLength },
        camera: {} as CameraAxis,
        screen: {} as PlayerScreen,
      },
      curve: curve,
      sprites: [],
      cars: [],
      color: Math.floor(n / this.state.rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT,
    });
  }

  private addSprite(index: number, sprite: Sprite, offset: number) {
    this.state.segments[index].sprites.push({ source: sprite, offset: offset });
  }

  private addRoad(enter: number, hold: number, leave: number, curve: number, y: number) {
    const startY = this.lastY();
    const endY = startY + Utils.toInt(y, 0) * this.state.segmentLength;
    let n;
    const total = enter + hold + leave;

    for (n = 0; n < enter; n++) {
      this.addSegment(Utils.easeIn(0, curve, n / enter), Utils.easeInOut(startY, endY, n / total));
    }
    for (n = 0; n < hold; n++) {
      this.addSegment(curve, Utils.easeInOut(startY, endY, (enter + n) / total));
    }
    for (n = 0; n < leave; n++) {
      this.addSegment(
        Utils.easeInOut(curve, 0, n / leave),
        Utils.easeInOut(startY, endY, (enter + hold + n) / total)
      );
    }
  }

  private addStraight(num: number) {
    num = num || ROAD.LENGTH.MEDIUM;
    this.addRoad(num, num, num, 0, 0);
  }

  private addHill(num: number, height: number) {
    num = num || ROAD.LENGTH.MEDIUM;
    height = height || ROAD.HILL.MEDIUM;
    this.addRoad(num, num, num, 0, height);
  }

  private addCurve(num: number, curve: number, height: number) {
    num = num || ROAD.LENGTH.MEDIUM;
    curve = curve || ROAD.CURVE.MEDIUM;
    height = height || ROAD.HILL.NONE;
    this.addRoad(num, num, num, curve, height);
  }

  private addLowRollingHills(num: number, height: number) {
    num = num || ROAD.LENGTH.SHORT;
    height = height || ROAD.HILL.LOW;
    this.addRoad(num, num, num, 0, height / 2);
    this.addRoad(num, num, num, 0, -height);
    this.addRoad(num, num, num, ROAD.CURVE.EASY, height);
    this.addRoad(num, num, num, 0, 0);
    this.addRoad(num, num, num, -ROAD.CURVE.EASY, height / 2);
    this.addRoad(num, num, num, 0, 0);
  }

  private addSCurves() {
    this.addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      -ROAD.CURVE.EASY,
      ROAD.HILL.NONE
    );
    this.addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.CURVE.MEDIUM,
      ROAD.HILL.MEDIUM
    );
    this.addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.CURVE.EASY,
      -ROAD.HILL.LOW
    );
    this.addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      -ROAD.CURVE.EASY,
      ROAD.HILL.MEDIUM
    );
    this.addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      -ROAD.CURVE.MEDIUM,
      -ROAD.HILL.MEDIUM
    );
  }

  private addBumps() {
    this.addRoad(10, 10, 10, 0, 5);
    this.addRoad(10, 10, 10, 0, -2);
    this.addRoad(10, 10, 10, 0, -5);
    this.addRoad(10, 10, 10, 0, 8);
    this.addRoad(10, 10, 10, 0, 5);
    this.addRoad(10, 10, 10, 0, -7);
    this.addRoad(10, 10, 10, 0, 5);
    this.addRoad(10, 10, 10, 0, -2);
  }

  private addDownhillToEnd(num: number) {
    num = num || 200;
    this.addRoad(num, num, num, -ROAD.CURVE.EASY, -this.lastY() / this.state.segmentLength);
  }

  public resetRoad(type?: 'straight') {
    this.state.segments.splice(0, this.state.segments.length);

    switch (type) {
      case 'straight':
        this.addStraight(ROAD.LENGTH.LONG);
        this.addBumps();
        this.addStraight(ROAD.LENGTH.LONG);
        this.addRoad(200, 200, 200, 0, -this.lastY() / this.state.segmentLength);
        break;
      default:
        this.addDefaultRoad();
        break;
    }

    this.resetSprites();
    this.resetCars();

    this.state.segments[
      Render.findSegment(this.state.segments, this.state.segmentLength, this.state.playerZ).index +
        2
    ].color = COLORS.START;
    this.state.segments[
      Render.findSegment(this.state.segments, this.state.segmentLength, this.state.playerZ).index +
        3
    ].color = COLORS.START;
    for (let n = 0; n < this.state.rumbleLength; n++)
      this.state.segments[this.state.segments.length - 1 - n].color = COLORS.FINISH;

    this.state.trackLength = this.state.segments.length * this.state.segmentLength;
  }

  private addDefaultRoad() {
    this.addStraight(ROAD.LENGTH.SHORT);
    this.addLowRollingHills(null, null);
    this.addSCurves();
    this.addCurve(ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW);
    this.addBumps();
    this.addLowRollingHills(null, null);
    this.addCurve(ROAD.LENGTH.LONG * 2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    this.addStraight(null);
    this.addHill(ROAD.LENGTH.MEDIUM, ROAD.HILL.HIGH);
    this.addSCurves();
    this.addCurve(ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM, ROAD.HILL.NONE);
    this.addHill(ROAD.LENGTH.LONG, ROAD.HILL.HIGH);
    this.addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM, -ROAD.HILL.LOW);
    this.addBumps();
    this.addHill(ROAD.LENGTH.LONG, -ROAD.HILL.MEDIUM);
    this.addStraight(null);
    this.addSCurves();
    this.addDownhillToEnd(null);
  }

  private resetSprites() {
    return;
    let n, i;

    this.addSprite(20, SPRITES.BILLBOARD07, -1);
    this.addSprite(40, SPRITES.BILLBOARD06, -1);
    this.addSprite(60, SPRITES.BILLBOARD08, -1);
    this.addSprite(80, SPRITES.BILLBOARD09, -1);
    this.addSprite(100, SPRITES.BILLBOARD01, -1);
    this.addSprite(120, SPRITES.BILLBOARD02, -1);
    this.addSprite(140, SPRITES.BILLBOARD03, -1);
    this.addSprite(160, SPRITES.BILLBOARD04, -1);
    this.addSprite(180, SPRITES.BILLBOARD05, -1);

    this.addSprite(240, SPRITES.BILLBOARD07, -1.2);
    this.addSprite(240, SPRITES.BILLBOARD06, 1.2);
    this.addSprite(this.state.segments.length - 25, SPRITES.BILLBOARD07, -1.2);
    this.addSprite(this.state.segments.length - 25, SPRITES.BILLBOARD06, 1.2);

    for (n = 10; n < 200; n += 4 + Math.floor(n / 100)) {
      this.addSprite(n, SPRITES.PALM_TREE, 0.5 + Math.random() * 0.5);
      this.addSprite(n, SPRITES.PALM_TREE, 1 + Math.random() * 2);
    }

    for (n = 250; n < 1000; n += 5) {
      this.addSprite(n, SPRITES.COLUMN, 1.1);
      this.addSprite(n + Utils.randomInt(0, 5), SPRITES.TREE1, -1 - Math.random() * 2);
      this.addSprite(n + Utils.randomInt(0, 5), SPRITES.TREE2, -1 - Math.random() * 2);
    }

    for (n = 200; n < this.state.segments.length; n += 3) {
      this.addSprite(
        n,
        Utils.randomChoice(SPRITES.PLANTS),
        Utils.randomChoice([1, -1]) * (2 + Math.random() * 5)
      );
    }

    let side, sprite, offset;
    for (n = 1000; n < this.state.segments.length - 50; n += 100) {
      side = Utils.randomChoice([1, -1]);
      this.addSprite(n + Utils.randomInt(0, 50), Utils.randomChoice(SPRITES.BILLBOARDS), -side);
      for (i = 0; i < 20; i++) {
        sprite = Utils.randomChoice(SPRITES.PLANTS);
        offset = side * (1.5 + Math.random());
        this.addSprite(n + Utils.randomInt(0, 50), sprite, offset);
      }
    }
  }

  private resetCars() {
    this.state.cars = [];
    let car, segment, offset, z, sprite, speed;
    for (let n = 0; n < this.state.totalCars; n++) {
      offset = Math.random() * Utils.randomChoice([-0.8, 0.8]);
      z = Math.floor(Math.random() * this.state.segments.length) * this.state.segmentLength;
      sprite = Utils.randomChoice(SPRITES.CARS);
      speed =
        this.state.maxSpeed / 4 +
        (Math.random() * this.state.maxSpeed) / (sprite == SPRITES.SEMI ? 4 : 2);
      car = { offset: offset, z: z, sprite: sprite, speed: speed };
      segment = Render.findSegment(this.state.segments, this.state.segmentLength, car.z);
      segment.cars.push(car);
      this.state.cars.push(car);
    }
  }
}
