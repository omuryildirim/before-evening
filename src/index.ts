import {Subject} from "rxjs";
import {KEY} from "./constants/keys.constant";
import {Dom} from "./helpers/dom";
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

    Game.run(this.options);
  }

  public resetGame() {
    this.state.reset();
  }

  private reset(options?) {
    options = options || {};
    this.state.canvas.width = this.state.width = Utils.toInt(options.width, this.state.width);
    this.state.canvas.height = this.state.height = Utils.toInt(options.height, this.state.height);
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
    this.refreshTweakUI();

    if ((this.state.segments.length == 0) || (options.segmentLength) || (options.rumbleLength))
      this.roadHelper.resetRoad(); // only rebuild road when necessary
  }


  private refreshTweakUI() {
    Dom.get('lanes').selectedIndex = this.state.lanes - 1;
    Dom.get('currentRoadWidth').innerHTML = Dom.get('roadWidth').value = this.state.roadWidth;
    Dom.get('currentCameraHeight').innerHTML = Dom.get('cameraHeight').value = this.state.cameraHeight;
    Dom.get('currentDrawDistance').innerHTML = Dom.get('drawDistance').value = this.state.drawDistance;
    Dom.get('currentFieldOfView').innerHTML = Dom.get('fieldOfView').value = this.state.fieldOfView;
    Dom.get('currentFogDensity').innerHTML = Dom.get('fogDensity').value = this.state.fogDensity;
  }

  get options() {
    return {
      canvas: this.state.canvas,
      render: () => {
        this.renderService.render()
      },
      update: (dt) => {
        this.state.update(dt, this.stateUpdate)
      },
      stats: this.state.stats,
      step: this.state.step,
      images: ["background", "sprites"],
      keys: [
        {
          keys: [KEY.LEFT, KEY.A], mode: 'down', action: () => {
            this.state.keyLeft = true;
          }
        },
        {
          keys: [KEY.RIGHT, KEY.D], mode: 'down', action: () => {
            this.state.keyRight = true;
          }
        },
        {
          keys: [KEY.UP, KEY.W], mode: 'down', action: () => {
            this.state.keyFaster = true;
          }
        },
        {
          keys: [KEY.DOWN, KEY.S], mode: 'down', action: () => {
            this.state.keySlower = true;
          }
        },
        {
          keys: [KEY.LEFT, KEY.A], mode: 'up', action: () => {
            this.state.keyLeft = false;
          }
        },
        {
          keys: [KEY.RIGHT, KEY.D], mode: 'up', action: () => {
            this.state.keyRight = false;
          }
        },
        {
          keys: [KEY.UP, KEY.W], mode: 'up', action: () => {
            this.state.keyFaster = false;
          }
        },
        {
          keys: [KEY.DOWN, KEY.S], mode: 'up', action: () => {
            this.state.keySlower = false;
          }
        }
      ],
      ready: (images) => {
        this.state.background = images[0];
        this.state.sprites = images[1];
        this.reset();
        Dom.storage.fast_lap_time = Dom.storage.fast_lap_time || 180;
        this.state.updateHud('fast_lap_time', this.state.formatTime(Utils.toFloat(Dom.storage.fast_lap_time)));
      },
      renderCanvas: false
    };
  }
}
