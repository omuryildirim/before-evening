import { AfterViewInit, Component } from '@angular/core';
import { BeforeEvening } from '../../../../../build/main';
import { GameStateService } from '../game-state.service';
import { StateUpdate } from '../../../../../build/main/interfaces/state.interfaces';
import { StatsRenderer } from './statsRenderer';

@Component({
  selector: 'car-game',
  templateUrl: './car-game.component.html',
  styleUrls: ['./car-game.component.scss']
})
export class CarGameComponent implements AfterViewInit {
  public currentState: StateUpdate;

  constructor(private gameStateService: GameStateService) {
  }

  ngAfterViewInit() {
    const beforeEvening = new BeforeEvening();

    this.gameStateService.associateStateUpdater(beforeEvening.stateUpdate);
    beforeEvening.runGame();

    const statsContainer = new StatsRenderer(beforeEvening.stats);

    beforeEvening.stateUpdate.subscribe(state => {
      this.currentState = state;
      statsContainer.updateStats(beforeEvening.stats.ms, beforeEvening.stats.msMin,
        beforeEvening.stats.msMax, beforeEvening.stats.fps,
        beforeEvening.stats.fpsMin, beforeEvening.stats.fpsMax);
    });

    this.gameStateService.refreshGame.subscribe(() => {
      beforeEvening.resetGame();
    });
  }
}
