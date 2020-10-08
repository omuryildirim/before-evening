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

