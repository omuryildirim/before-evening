import type { MetaFunction } from "@remix-run/cloudflare";
import { useRef, useState } from "react";
import CarGame from "~/components/car-game";
import GameStateService from "~/components/GameStateService";
import ReinforcementLearning from "~/components/reinforcement-learning";

export const meta: MetaFunction = () => {
	return [
		{ title: "Before Evening" },
		{ name: "description", content: "Welcome to Before Evening project!" },
	];
};

export default function Index() {
	const [gameStateService] = useState(new GameStateService());
	const leftSideRef = useRef<HTMLDivElement>(null);

	return (
		<div className="main-container flex h-full w-full">
			<div className="left-side flex overflow-y-auto" ref={leftSideRef}>
				<CarGame
					gameStateService={gameStateService}
					leftSideRef={leftSideRef}
				/>
			</div>
			<div className="right-side overflow-y-auto">
				<ReinforcementLearning gameStateService={gameStateService} />
			</div>
		</div>
	);
}
