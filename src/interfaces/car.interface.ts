import {Sprite} from "./sprite.interface";

export interface Car {
  offset: number;
  z: number;
  sprite: Sprite;
  speed: number;
}
