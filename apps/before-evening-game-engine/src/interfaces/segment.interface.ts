import type { Sprite } from "./sprite.interface";

export interface Segment {
	index: number;
	p1: PlayerWorld;
	p2: PlayerWorld;
	curve: number;
	color: SegmentColorMap;
	sprites: { source: Sprite; offset: number }[];
	cars: [];
}

export interface SegmentColorMap {
	road: string;
	grass: string;
	rumble: string;
	lane?: string;
}

export interface PlayerWorld {
	world: { y: number; z: number };
	camera: CameraAxis;
	screen: PlayerScreen;
}

export interface CameraAxis {
	z: number;
	x: number;
	y: number;
}

export interface PlayerScreen {
	scale: number;
	w: number;
	x: number;
	y: number;
}
