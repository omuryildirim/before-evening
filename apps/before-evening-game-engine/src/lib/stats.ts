export class Stats {
	public startTime: number;
	public prevTime: number;
	public fps: number;
	public ms: number;
	public msMin: number;
	public msMax: number;
	public fpsMin: number;
	public fpsMax: number;
	private frames: number;

	private _currentLapTime: number; // current lap time
	private _lastLapTime: number; // last lap time
	private _bestLapTime: number; // last lap time
	private _speed: number; // last lap time
	public totalTime: number; // last lap time

	constructor() {
		this.startTime = Date.now();
		this.prevTime = this.startTime;
		this.ms = 0;
		this.msMin = 1000;
		this.msMax = 0;
		this.fps = 0;
		this.fpsMin = 1000;
		this.fpsMax = 0;
		this.frames = 0;

		this._currentLapTime = 0;
		this._lastLapTime = 0;
		this._bestLapTime = 0;
		this.totalTime = 0;
		this._speed = 0;
	}

	public addTime({
		dt,
		increaseCurrentLapTime,
		refreshLap,
	}: {
		dt: number;
		increaseCurrentLapTime: boolean;
		refreshLap: boolean;
	}) {
		this.totalTime += dt;

		if (increaseCurrentLapTime) {
			this._currentLapTime += dt;
		}

		if (refreshLap) {
			this._lastLapTime = this._currentLapTime;
			this._currentLapTime = 0;
			this._bestLapTime = this._bestLapTime
				? Math.min(this._bestLapTime, this._lastLapTime)
				: this._lastLapTime;
		}
	}

	get currentLapTime() {
		return this._currentLapTime.toFixed(2);
	}

	get lastLapTime() {
		return this._lastLapTime.toFixed(2);
	}

	get bestLapTime() {
		return this._bestLapTime.toFixed(2);
	}

	public updateSpeed(speed: number) {
		this._speed = (1.60934 * speed) / 100;
	}

	get speed() {
		return this._speed.toFixed();
	}

	public reset() {
		this.totalTime = 0;
		this._currentLapTime = 0;
		this._lastLapTime = 0;
	}

	public current() {
		return this.fps;
	}

	public begin() {
		this.startTime = Date.now();
	}

	public end() {
		const time = Date.now();

		this.ms = time - this.startTime;
		this.msMin = Math.min(this.msMin, this.ms);
		this.msMax = Math.max(this.msMax, this.ms);

		this.frames++;

		if (time > this.prevTime + 1000) {
			this.fps = Math.round((this.frames * 1000) / (time - this.prevTime));
			this.fpsMin = Math.min(this.fpsMin, this.fps);
			this.fpsMax = Math.max(this.fpsMax, this.fps);

			this.prevTime = time;
			this.frames = 0;
		}

		return time;
	}

	public update() {
		this.startTime = this.end();
	}
}
