import { Stats } from "../lib/stats";

export const Game = {
	// a modified version of the game loop from my previous boulderdash game - see http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/#gameloop
	loadImages: (names, callback) => {
		// load multiple images and callback when ALL images have loaded
		const result = [];
		let count = names.length;

		const onload = () => {
			if (--count === 0) callback(result);
		};

		for (let n = 0; n < names.length; n++) {
			const name = names[n];
			result[n] = document.createElement("img");
			result[n].addEventListener("load", onload);
			result[n].src = `images/${name}.png`;
		}
	},

	//---------------------------------------------------------------------------

	stats: () => {
		// construct mr.doobs FPS counter - along with friendly good/bad/ok message box
		return new Stats();
	},

	//---------------------------------------------------------------------------

	playMusic: () => {
		const music = document.getElementById("music") as HTMLAudioElement;
		music.loop = true;
		music.volume = 0.05; // shhhh! annoying music!
		music.muted = true;
		music.play();
		document.getElementById("mute").addEventListener("click", () => {
			music.muted = !music.muted;
		});
	},
};
