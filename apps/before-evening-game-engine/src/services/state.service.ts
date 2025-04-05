import type { Subject } from "rxjs";

import { SPRITES } from "../constants/sprites.constants";
import { Game } from "../helpers/game";
import type { StateUpdate } from "../interfaces";
import type { Car } from "../interfaces/car.interface";
import type { Segment } from "../interfaces/segment.interface";
import type { Stats } from "../lib/stats";
import { Utils } from "../lib/utils";

import type { Sprite } from "../interfaces/sprite.interface";
import { Render } from "./render";

export class StateService {
	private _skipRender = false;

	public fps: number; // how many 'update' frames per second
	public step: number; // how long is each frame (in seconds)
	public width: number; // logical canvas width
	public height: number; // logical canvas height
	public centrifugal: number; // centrifugal force multiplier when going around curves
	public skySpeed: number; // background sky layer scroll speed when going around curve (or up hill)
	public hillSpeed: number; // background hill layer scroll speed when going around curve (or up hill)
	public treeSpeed: number; // background tree layer scroll speed when going around curve (or up hill)
	public skyOffset: number; // current sky scroll offset
	public hillOffset: number; // current hill scroll offset
	public treeOffset: number; // current tree scroll offset
	public segments: Segment[]; // array of road segments
	public cars: Car[]; // array of cars on the road
	public stats: Stats; // mr.doobs FPS counter
	public background: CanvasImageSource; // our background image (loaded below)
	public sprites: CanvasImageSource; // our spritesheet (loaded below)
	public resolution: number; // scaling factor to provide resolution independence (computed)
	public roadWidth: number; // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
	public segmentLength: number; // length of a single segment
	public rumbleLength: number; // number of segments per red/white rumble strip
	public trackLength: number; // z length of entire track (computed)
	public lanes: number; // number of lanes
	public fieldOfView: number; // angle (degrees) for field of view
	public cameraHeight: number; // z height of camera
	public cameraDepth: number; // z distance camera is from screen (computed)
	public drawDistance: number; // number of segments to draw
	public playerX: number; // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
	public playerZ: number; // player relative z distance from camera (computed)
	public fogDensity: number; // exponential fog density
	public position: number; // current camera Z position (add playerZ to get player's absolute Z position)
	public speed: number; // current speed
	public maxSpeed: number; // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)
	public accel: number; // acceleration rate - tuned until it 'felt' right
	public breaking: number; // deceleration rate when braking
	public decel: number; // 'natural' deceleration rate when neither accelerating, nor braking
	public offRoadDecel: number; // off road deceleration is somewhere in between
	public offRoadLimit: number; // limit when off road deceleration no longer applies (e.g. you can always go at least this speed even when off road)
	public totalCars: number; // total number of cars on the road
	public currentLapTime: number; // current lap time
	public lastLapTime: number; // last lap time
	public passedFromStartLine = false;

	public keyLeft: boolean;
	public keyRight: boolean;
	public keyFaster: boolean;
	public keySlower: boolean;

	public hud: {
		speed: { value: number; dom: number };
		current_lap_time: { value: number; dom: number };
		last_lap_time: { value: number; dom: number };
		fast_lap_time: { value: number; dom: number };
	};

	constructor() {
		this.fps = 60; // how many 'update' frames per second
		this.step = 1 / this.fps; // how long is each frame (in seconds)
		this.width = 1024; // logical canvas width
		this.height = 768; // logical canvas height
		this.centrifugal = 0.3; // centrifugal force multiplier when going around curves
		this.skySpeed = 0.001; // background sky layer scroll speed when going around curve (or up hill)
		this.hillSpeed = 0.002; // background hill layer scroll speed when going around curve (or up hill)
		this.treeSpeed = 0.003; // background tree layer scroll speed when going around curve (or up hill)
		this.skyOffset = 0; // current sky scroll offset
		this.hillOffset = 0; // current hill scroll offset
		this.treeOffset = 0; // current tree scroll offset
		this.segments = []; // array of road segments
		this.cars = []; // array of cars on the road
		this.stats = Game.stats(); // mr.doobs FPS counter
		this.background = null; // our background image (loaded below)
		this.sprites = null; // our spritesheet (loaded below)
		this.resolution = null; // scaling factor to provide resolution independence (computed)
		this.roadWidth = 2000; // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
		this.segmentLength = 200; // length of a single segment
		this.rumbleLength = 3; // number of segments per red/white rumble strip
		this.trackLength = null; // z length of entire track (computed)
		this.lanes = 3; // number of lanes
		this.fieldOfView = 100; // angle (degrees) for field of view
		this.cameraHeight = 1000; // z height of camera
		this.cameraDepth = null; // z distance camera is from screen (computed)
		this.drawDistance = 300; // number of segments to draw
		this.playerX = 0; // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
		this.playerZ = null; // player relative z distance from camera (computed)
		this.fogDensity = 5; // exponential fog density
		this.position = 0; // current camera Z position (add playerZ to get player's absolute Z position)
		this.speed = 0; // current speed
		this.maxSpeed = this.segmentLength / this.step; // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)
		this.accel = this.maxSpeed / 5; // acceleration rate - tuned until it 'felt' right
		this.breaking = -this.maxSpeed; // deceleration rate when braking
		this.decel = -this.maxSpeed / 5; // 'natural' deceleration rate when neither accelerating, nor braking
		this.offRoadDecel = -this.maxSpeed / 2; // off road deceleration is somewhere in between
		this.offRoadLimit = this.maxSpeed / 4; // limit when off road deceleration no longer applies (e.g. you can always go at least this speed even when off road)
		this.totalCars = 0; // total number of cars on the road
		this.currentLapTime = 0; // current lap time
		this.lastLapTime = null; // last lap time

		this.keyLeft = false;
		this.keyRight = false;
		this.keyFaster = false;
		this.keySlower = false;
	}

	public update(
		dt: number,
		stateUpdater: Subject<StateUpdate>,
	): undefined | StateUpdate {
		let n: number;
		let car: Car;
		let carW: number;
		let sprite: Sprite;
		let spriteW: number;
		const playerSegment = Render.findSegment(
			this.segments,
			this.segmentLength,
			this.position + this.playerZ,
		);
		const playerW = SPRITES.PLAYER_STRAIGHT.w * SPRITES.SCALE;
		const startPosition = this.position;

		this.updateCars(dt, playerSegment, playerW);

		this.position = Utils.increase(
			this.position,
			dt * this.speed,
			this.trackLength,
		);

		// determine if car passed from start line before.
		// if starting position is 0 or current position is lower than starting position
		// which means car finished track and started a new tour
		this.passedFromStartLine =
			this.passedFromStartLine ||
			startPosition === 0 ||
			this.position < startPosition;

		if (this.keyFaster) {
			this.speed = Utils.accelerate(this.speed, this.accel, dt);
		} else if (this.keySlower) {
			this.speed = Utils.accelerate(this.speed, this.breaking, dt);
		} else {
			this.speed = Utils.accelerate(this.speed, this.decel, dt);
		}

		let speedPercent = Math.min(this.speed / this.maxSpeed, 1);
		const dx = dt * 2 * speedPercent; // at top speed, should be able to cross from left to right (-1 to 1) in 1 second
		if (this.keyLeft) {
			this.playerX = this.playerX - dx;
		} else if (this.keyRight) {
			this.playerX = this.playerX + dx;
		}

		this.playerX =
			this.playerX - dx * speedPercent * playerSegment.curve * this.centrifugal;

		if (this.playerX < -1 || this.playerX > 1) {
			if (this.speed > this.offRoadLimit) {
				this.speed = Utils.accelerate(this.speed, this.offRoadDecel, dt);
			}

			for (n = 0; n < playerSegment.sprites.length; n++) {
				sprite = playerSegment.sprites[n];
				spriteW = sprite.source.w * SPRITES.SCALE;
				if (
					Utils.overlap(
						this.playerX,
						playerW,
						sprite.offset + (spriteW / 2) * (sprite.offset > 0 ? 1 : -1),
						spriteW,
					)
				) {
					this.speed = this.maxSpeed / 5;
					this.position = Utils.increase(
						playerSegment.p1.world.z,
						-this.playerZ,
						this.trackLength,
					); // stop in front of sprite (at front of segment)
					break;
				}
			}
		}

		for (n = 0; n < playerSegment.cars.length; n++) {
			car = playerSegment.cars[n];
			carW = car.sprite.w * SPRITES.SCALE;
			if (this.speed > car.speed) {
				if (Utils.overlap(this.playerX, playerW, car.offset, carW, 0.8)) {
					this.speed = car.speed * (car.speed / this.speed);
					this.position = Utils.increase(
						car.z,
						-this.playerZ,
						this.trackLength,
					);
					break;
				}
			}
		}

		this.playerX = Utils.limit(this.playerX, -3, 3); // dont ever let it go too far out of bounds
		this.speed = Utils.limit(this.speed, 0, this.maxSpeed); // or exceed maxSpeed

		this.skyOffset = Utils.increase(
			this.skyOffset,
			(this.skySpeed * playerSegment.curve * (this.position - startPosition)) /
				this.segmentLength,
			1,
		);
		this.hillOffset = Utils.increase(
			this.hillOffset,
			(this.hillSpeed * playerSegment.curve * (this.position - startPosition)) /
				this.segmentLength,
			1,
		);
		this.treeOffset = Utils.increase(
			this.treeOffset,
			(this.treeSpeed * playerSegment.curve * (this.position - startPosition)) /
				this.segmentLength,
			1,
		);

		if (!this.passedFromStartLine) {
			this.stats.addTime({
				dt,
				increaseCurrentLapTime: false,
				refreshLap: false,
			});
		} else {
			if (startPosition > this.position) {
				this.stats.addTime({
					dt,
					increaseCurrentLapTime: true,
					refreshLap: true,
				});
			} else {
				this.currentLapTime += dt;
				this.stats.addTime({
					dt,
					increaseCurrentLapTime: true,
					refreshLap: false,
				});
			}
		}

		this.stats.updateSpeed(this.speed);

		const next5Curve = [];
		for (let index = 1; index < 6; index++) {
			const curve = Render.findSegment(
				this.segments,
				this.segmentLength,
				this.position + this.playerZ + index * this.segmentLength,
			).curve;
			next5Curve.push(curve);
		}

		speedPercent = this.speed / this.maxSpeed;
		if (stateUpdater) {
			stateUpdater.next({
				playerX: this.playerX,
				speed: speedPercent,
				next5Curve: next5Curve,
			});
			return undefined;
		}
		return {
			playerX: this.playerX,
			speed: speedPercent,
			next5Curve: next5Curve,
		};
	}

	//-------------------------------------------------------------------------

	public updateCars(dt, playerSegment, playerW) {
		let oldSegment: Segment;
		let newSegment: Segment;
		let car: Car;
		let n: number;
		for (n = 0; n < this.cars.length; n++) {
			car = this.cars[n];
			oldSegment = Render.findSegment(this.segments, this.segmentLength, car.z);
			car.offset =
				car.offset +
				this.updateCarOffset(car, oldSegment, playerSegment, playerW);
			car.z = Utils.increase(car.z, dt * car.speed, this.trackLength);
			car.percent = Utils.percentRemaining(car.z, this.segmentLength); // useful for interpolation during rendering phase
			newSegment = Render.findSegment(this.segments, this.segmentLength, car.z);
			if (oldSegment !== newSegment) {
				const index = oldSegment.cars.indexOf(car);
				oldSegment.cars.splice(index, 1);
				newSegment.cars.push(car);
			}
		}
	}

	public updateCarOffset(car, carSegment, playerSegment, playerW) {
		let segment: Segment;
		let otherCar: Car;
		let otherCarW: number;
		let i: number;
		let j: number;
		let dir: number;
		const lookahead = 20;
		const carW = car.sprite.w * SPRITES.SCALE;

		// optimization, dont bother steering around other cars when 'out of sight' of the player
		if (carSegment.index - playerSegment.index > this.drawDistance) return 0;

		for (i = 1; i < lookahead; i++) {
			segment = this.segments[(carSegment.index + i) % this.segments.length];

			if (
				segment === playerSegment &&
				car.speed > this.speed &&
				Utils.overlap(this.playerX, playerW, car.offset, carW, 1.2)
			) {
				if (this.playerX > 0.5) dir = -1;
				else if (this.playerX < -0.5) dir = 1;
				else dir = car.offset > this.playerX ? 1 : -1;
				return (((dir * 1) / i) * (car.speed - this.speed)) / this.maxSpeed; // the closer the cars (smaller i) and the greated the speed ratio, the larger the offset
			}

			for (j = 0; j < segment.cars.length; j++) {
				otherCar = segment.cars[j];
				otherCarW = otherCar.sprite.w * SPRITES.SCALE;
				if (
					car.speed > otherCar.speed &&
					Utils.overlap(car.offset, carW, otherCar.offset, otherCarW, 1.2)
				) {
					if (otherCar.offset > 0.5) dir = -1;
					else if (otherCar.offset < -0.5) dir = 1;
					else dir = car.offset > otherCar.offset ? 1 : -1;
					return (
						(((dir * 1) / i) * (car.speed - otherCar.speed)) / this.maxSpeed
					);
				}
			}
		}

		// if no cars ahead, but I have somehow ended up off road, then steer back on
		if (car.offset < -0.9) return 0.1;
		if (car.offset > 0.9) return -0.1;
		return 0;
	}

	public formatTime(dt) {
		const minutes = Math.floor(dt / 60);
		const seconds = Math.floor(dt - minutes * 60);
		const tenths = Math.floor(10 * (dt - Math.floor(dt)));
		if (minutes > 0)
			return `${minutes}.${seconds < 10 ? "0" : ""}${seconds}.${tenths}`;
		return `${seconds}.${tenths}`;
	}

	public randomizeState(randomizeStartPoint?: boolean) {
		this.skySpeed = 0.001; // background sky layer scroll speed when going around curve (or up hill)
		this.hillSpeed = 0.002; // background hill layer scroll speed when going around curve (or up hill)
		this.treeSpeed = 0.003; // background tree layer scroll speed when going around curve (or up hill)
		this.skyOffset = 0; // current sky scroll offset
		this.hillOffset = 0; // current hill scroll offset
		this.treeOffset = 0; // current tree scroll offset
		this.cameraHeight = 1000; // z height of camera
		this.playerX = 0; // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
		this.position = 0; // current camera Z position (add playerZ to get player's absolute Z position)
		this.speed = 0; // current speed
		this.totalCars = 0; // total number of cars on the road
		this.currentLapTime = 0; // current lap time
		this.lastLapTime = null; // last lap time
		this.stats.reset();

		this.keyLeft = false;
		this.keyRight = false;
		this.keyFaster = false;
		this.keySlower = false;

		if (randomizeStartPoint) {
			this.playerX = Math.random() * 2 - 1; // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
			this.position = Math.random() * this.trackLength; // current camera Z position (add playerZ to get player's absolute Z position)
			this.speed = Math.random() * this.maxSpeed; // current speed
		}
	}

	get skipRender() {
		return this._skipRender;
	}

	set skipRender(skipRender) {
		this._skipRender = skipRender;

		// If render is skipped decrease step to 1ms to fasten the simulation.
		this.step = skipRender ? 0.0001 : 1 / this.fps;
	}
}
