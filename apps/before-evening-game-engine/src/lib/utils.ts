export const Utils = {
	timestamp: () => new Date().getTime(),
	toInt: (obj, def) => {
		if (obj !== null) {
			const x = Number.parseInt(obj, 10);
			if (!isNaN(x)) return x;
		}
		return Utils.toInt(def, 0);
	},
	toFloat: (obj, def?) => {
		if (obj !== null) {
			const x = Number.parseFloat(obj);
			if (!isNaN(x)) return x;
		}
		return Utils.toFloat(def, 0.0);
	},
	limit: (value, min, max) => Math.max(min, Math.min(value, max)),
	randomInt: (min, max) =>
		Math.round(Utils.interpolate(min, max, Math.random())),
	randomChoice: (options) => options[Utils.randomInt(0, options.length - 1)],
	percentRemaining: (n, total) => (n % total) / total,
	accelerate: (v, accel, dt) => v + accel * dt,
	interpolate: (a, b, percent) => a + (b - a) * percent,
	easeIn: (a, b, percent) => a + (b - a) * Math.pow(percent, 2),
	easeOut: (a, b, percent) => a + (b - a) * (1 - Math.pow(1 - percent, 2)),
	easeInOut: (a, b, percent) =>
		a + (b - a) * (-Math.cos(percent * Math.PI) / 2 + 0.5),
	exponentialFog: (distance, density) =>
		1 / Math.pow(Math.E, distance * distance * density),

	increase: (start, increment, max) => {
		// with looping
		let result = start + increment;
		while (result >= max) result -= max;
		while (result < 0) result += max;
		return result;
	},

	project: (
		p,
		cameraX,
		cameraY,
		cameraZ,
		cameraDepth,
		width,
		height,
		roadWidth,
	) => {
		p.camera.x = (p.world.x || 0) - cameraX;
		p.camera.y = (p.world.y || 0) - cameraY;
		p.camera.z = (p.world.z || 0) - cameraZ;
		p.screen.scale = cameraDepth / p.camera.z;
		p.screen.x = Math.round(
			width / 2 + (p.screen.scale * p.camera.x * width) / 2,
		);
		p.screen.y = Math.round(
			height / 2 - (p.screen.scale * p.camera.y * height) / 2,
		);
		p.screen.w = Math.round((p.screen.scale * roadWidth * width) / 2);
	},

	overlap: (x1, w1, x2, w2, percent?) => {
		const half = (percent || 1) / 2;
		const min1 = x1 - w1 * half;
		const max1 = x1 + w1 * half;
		const min2 = x2 - w2 * half;
		const max2 = x2 + w2 * half;
		return !(max1 < min2 || min1 > max2);
	},
};
