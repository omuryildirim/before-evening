import {BACKGROUND} from "../constants/background.constant";
import {COLORS} from "../constants/colors.constant";
import {SPRITES} from "../constants/sprites.constants";
import {Segment, SegmentColorMap} from "../interfaces/segment.interface";
import {Sprite} from '../interfaces/sprite.interface';
import {Utils} from "../lib/utils";
import {StateService} from "./state.service";

export class Render {
  constructor(private state: StateService) {
  }

  polygon(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  //---------------------------------------------------------------------------

  segment(x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, fog: number, color: SegmentColorMap) {
    const r1 = this.rumbleWidth(w1, this.state.lanes),
      r2 = this.rumbleWidth(w2, this.state.lanes),
      l1 = this.laneMarkerWidth(w1, this.state.lanes),
      l2 = this.laneMarkerWidth(w2, this.state.lanes);

    let lanew1, lanew2, lanex1, lanex2, lane;

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color.grass;
    ctx.fillRect(0, y2, this.state.width, y1 - y2);

    this.polygon(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
    this.polygon(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble);
    this.polygon(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

    if (color.lane) {
      lanew1 = w1 * 2 / this.state.lanes;
      lanew2 = w2 * 2 / this.state.lanes;
      lanex1 = x1 - w1 + lanew1;
      lanex2 = x2 - w2 + lanew2;
      for (lane = 1; lane < this.state.lanes; lanex1 += lanew1, lanex2 += lanew2, lane++)
        this.polygon(lanex1 - l1 / 2, y1, lanex1 + l1 / 2, y1, lanex2 + l2 / 2, y2, lanex2 - l2 / 2, y2, color.lane);
    }

    this.fog(ctx, 0, y1, this.state.width, y2 - y1, fog);
  }

  //---------------------------------------------------------------------------

  background(layer: Sprite, rotation: number, offset: number) {
    rotation = rotation || 0;
    offset = offset || 0;

    const imageW = layer.w / 2;
    const imageH = layer.h;

    const sourceX = layer.x + Math.floor(layer.w * rotation);
    const sourceY = layer.y;
    const sourceW = Math.min(imageW, layer.x + layer.w - sourceX);
    const sourceH = imageH;

    const destX = 0;
    const destY = offset;
    const destW = Math.floor(this.state.width * (sourceW / imageW));
    const destH = this.state.height;

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.state.background, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH);

    if (sourceW < imageW) {
      ctx.drawImage(this.state.background, layer.x, sourceY, imageW - sourceW, sourceH, destW - 1, destY, this.state.width - destW, destH);
    }
  }

  //---------------------------------------------------------------------------

  sprite(sprite: Sprite, scale: number, destX: number, destY: number, offsetX: number, offsetY: number, clipY?: number) {
    //  scale for projection AND relative to this.state.roadWidth (for tweakUI)
    const destW = (sprite.w * scale * this.state.width / 2) * (SPRITES.SCALE * this.state.roadWidth);
    const destH = (sprite.h * scale * this.state.width / 2) * (SPRITES.SCALE * this.state.roadWidth);

    destX = destX + (destW * (offsetX || 0));
    destY = destY + (destH * (offsetY || 0));

    const clipH = clipY ? Math.max(0, destY + destH - clipY) : 0;

    if (clipH < destH) {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.state.sprites, sprite.x, sprite.y, sprite.w, sprite.h - (sprite.h * clipH / destH), destX, destY, destW, destH - clipH);
    }

  }

  //---------------------------------------------------------------------------

  player(speedPercent: number, scale: number, destX: number, destY: number, steer: number, updown: number) {

    const bounce = (1.5 * Math.random() * speedPercent * this.state.resolution) * Utils.randomChoice([-1, 1]);
    let sprite;
    if (steer < 0)
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_LEFT : SPRITES.PLAYER_LEFT;
    else if (steer > 0)
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_RIGHT : SPRITES.PLAYER_RIGHT;
    else
      sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_STRAIGHT : SPRITES.PLAYER_STRAIGHT;

    this.sprite(sprite, scale, destX, destY + bounce, -0.5, -1);
  }

  //---------------------------------------------------------------------------

  fog(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fog: number) {
    if (fog < 1) {
      ctx.globalAlpha = (1 - fog);
      ctx.fillStyle = COLORS.FOG;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1;
    }
  }
  rumbleWidth (projectedRoadWidth: number, lanes: number) {
    return projectedRoadWidth / Math.max(6, 2 * lanes);
  }
  laneMarkerWidth (projectedRoadWidth: number, lanes: number) {
    return projectedRoadWidth / Math.max(32, 8 * lanes);
  }
  render() {
    const baseSegment = Render.findSegment(this.state.segments, this.state.segmentLength, this.state.position);
    const basePercent = Utils.percentRemaining(this.state.position, this.state.segmentLength);
    const playerSegment = Render.findSegment(this.state.segments, this.state.segmentLength, this.state.position + this.state.playerZ);
    const playerPercent = Utils.percentRemaining(this.state.position + this.state.playerZ, this.state.segmentLength);
    const playerY = Utils.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
    let maxy = this.state.height;

    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.state.width, this.state.height);

    this.background(BACKGROUND.SKY, this.state.skyOffset, this.state.resolution * this.state.skySpeed * playerY);
    this.background(BACKGROUND.HILLS, this.state.hillOffset, this.state.resolution * this.state.hillSpeed * playerY);
    this.background(BACKGROUND.TREES, this.state.treeOffset, this.state.resolution * this.state.treeSpeed * playerY);

    let n, i, car, segment, sprite, spriteScale, spriteX, spriteY;

    for (n = 0; n < this.state.drawDistance; n++) {

      segment = this.state.segments[(baseSegment.index + n) % this.state.segments.length];
      segment.looped = segment.index < baseSegment.index;
      segment.fog = Utils.exponentialFog(n / this.state.drawDistance, this.state.fogDensity);
      segment.clip = maxy;

      Utils.project(segment.p1, (this.state.playerX * this.state.roadWidth) - x, playerY + this.state.cameraHeight, this.state.position - (segment.looped ? this.state.trackLength : 0), this.state.cameraDepth, this.state.width, this.state.height, this.state.roadWidth);
      Utils.project(segment.p2, (this.state.playerX * this.state.roadWidth) - x - dx, playerY + this.state.cameraHeight, this.state.position - (segment.looped ? this.state.trackLength : 0), this.state.cameraDepth, this.state.width, this.state.height, this.state.roadWidth);

      x = x + dx;
      dx = dx + segment.curve;

      if ((segment.p1.camera.z <= this.state.cameraDepth) || // behind us
        (segment.p2.screen.y >= segment.p1.screen.y) || // back face cull
        (segment.p2.screen.y >= maxy))                  // clip by (already rendered) hill
        continue;

      this.segment(segment.p1.screen.x,
        segment.p1.screen.y,
        segment.p1.screen.w,
        segment.p2.screen.x,
        segment.p2.screen.y,
        segment.p2.screen.w,
        segment.fog,
        segment.color);

      maxy = segment.p1.screen.y;
    }

    for (n = (this.state.drawDistance - 1); n > 0; n--) {
      segment = this.state.segments[(baseSegment.index + n) % this.state.segments.length];

      for (i = 0; i < segment.cars.length; i++) {
        car = segment.cars[i];
        sprite = car.sprite;
        spriteScale = Utils.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent);
        spriteX = Utils.interpolate(segment.p1.screen.x, segment.p2.screen.x, car.percent) + (spriteScale * car.offset * this.state.roadWidth * this.state.width / 2);
        spriteY = Utils.interpolate(segment.p1.screen.y, segment.p2.screen.y, car.percent);
        this.sprite(car.sprite, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip);
      }

      for (i = 0; i < segment.sprites.length; i++) {
        sprite = segment.sprites[i];
        spriteScale = segment.p1.screen.scale;
        spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * this.state.roadWidth * this.state.width / 2);
        spriteY = segment.p1.screen.y;
        this.sprite(sprite.source, spriteScale, spriteX, spriteY, (sprite.offset < 0 ? -1 : 0), -1, segment.clip);
      }

      if (segment == playerSegment) {
        this.player(this.state.speed / this.state.maxSpeed,
          this.state.cameraDepth / this.state.playerZ,
          this.state.width / 2,
          (this.state.height / 2) - (this.state.cameraDepth / this.state.playerZ * Utils.interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) * this.state.height / 2),
          this.state.speed * (this.state.keyLeft ? -1 : this.state.keyRight ? 1 : 0),
          playerSegment.p2.world.y - playerSegment.p1.world.y);
      }
    }
  }
  public static findSegment(segments: Segment[], segmentLength: number, z: number) {
    return segments[Math.floor(z / segmentLength) % segments.length];
  }
}
