import {Subject} from "rxjs";

import {KEY} from "./constants/keys.constant";
import {Game} from "./helpers/game";
import {StateUpdate} from "./interfaces/state.interfaces";
import {Utils} from "./lib/utils";
import {Render} from "./services/render";
import {RoadHelper} from "./services/road.helper";
import {StateService} from "./services/state.service";

export * from './helpers/sprites';

export class BeforeEvening {
  private state: StateService;
  private roadHelper: RoadHelper;
  private renderService: Render;
  public stateUpdate: Subject<StateUpdate>;

  constructor() {
    this.state = new StateService();
    this.roadHelper = new RoadHelper(this.state);
    this.renderService = new Render(this.state);
    this.stateUpdate = new Subject();
    this.roadHelper.resetRoad(); // only rebuild road when necessary
  }

  public resetGame() {
    this.state.randomizeState();
  }

  private reset(options?) {
    options = options || {};
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    canvas.width = this.state.width = Utils.toInt(options.width, this.state.width);
    canvas.height = this.state.height = Utils.toInt(options.height, this.state.height);
    this.state.lanes = Utils.toInt(options.lanes, this.state.lanes);
    this.state.roadWidth = Utils.toInt(options.roadWidth, this.state.roadWidth);
    this.state.cameraHeight = Utils.toInt(options.cameraHeight, this.state.cameraHeight);
    this.state.drawDistance = Utils.toInt(options.drawDistance, this.state.drawDistance);
    this.state.fogDensity = Utils.toInt(options.fogDensity, this.state.fogDensity);
    this.state.fieldOfView = Utils.toInt(options.fieldOfView, this.state.fieldOfView);
    this.state.segmentLength = Utils.toInt(options.segmentLength, this.state.segmentLength);
    this.state.rumbleLength = Utils.toInt(options.rumbleLength, this.state.rumbleLength);
    this.state.cameraDepth = 1 / Math.tan((this.state.fieldOfView / 2) * Math.PI / 180);
    this.state.playerZ = (this.state.cameraHeight * this.state.cameraDepth);
    this.state.resolution = this.state.height / 480;

    if ((this.state.segments.length == 0) || (options.segmentLength) || (options.rumbleLength))
      this.roadHelper.resetRoad(); // only rebuild road when necessary
  }

  public runGame() {
    Game.loadImages(["background", "sprites"], (images) => {
      this.ready(images); // tell caller to initialize itself because images are loaded and we're ready to rumble
      this.setKeyListener();
      this.calculateNextFrame(); // lets get this party started
      Game.playMusic();
    });
  }

  private calculateNextFrame(now: number = null, last: number = Utils.timestamp(), dt = 0, gdt = 0) {
    now = Utils.timestamp();
    dt = Math.min(1, (now - last) / 1000); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
    gdt = gdt + dt;

    while (gdt > this.state.step) {
      gdt = gdt - this.state.step;
      this.state.update(this.state.step, this.stateUpdate);
    }

    this.renderService.render();

    this.state.stats.update();

    last = now;
    requestAnimationFrame(this.calculateNextFrame.bind(this, now, last, dt, gdt)); // requestAnimationFrame(frame, canvas);
  }

  public simulateState(): StateUpdate {
    return this.state.update(this.state.step, null) as StateUpdate;
  }

  public getState(): StateUpdate {
    const next5Curve = [];
    for (let index = 1; index < 6; index++) {
      const curve = Render.findSegment(this.state.segments, this.state.segmentLength, this.state.position + this.state.playerZ + (index * this.state.segmentLength)).curve;
      next5Curve.push(curve);
    }

    return {playerX: this.state.playerX, speed: this.state.speed/this.state.maxSpeed, next5Curve: next5Curve};
  }

  private ready(images) {
    this.state.background = images[0];
    this.state.sprites = images[1];
    this.reset();
  }

  private setKeyListener() {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      this.changeDirectionAccordingToKey(event.keyCode, 'down');
    });
    document.addEventListener('keyup', (event: KeyboardEvent) => {
      this.changeDirectionAccordingToKey(event.keyCode, 'up');
    });
  }

  public changeDirectionAccordingToKey(keyCode: number, mode: 'down' | 'up') {
    switch (keyCode) {
      case KEY.LEFT:
      case KEY.A:
        this.state.keyLeft = mode === 'down';
        break;
      case KEY.RIGHT:
      case KEY.D:
        this.state.keyRight = mode === 'down';
        break;
      case KEY.UP:
      case KEY.W:
        this.state.keyFaster = mode === 'down';
        break;
      case KEY.DOWN:
      case KEY.S:
        this.state.keySlower = mode === 'down';
        break;
    }
  }
}
