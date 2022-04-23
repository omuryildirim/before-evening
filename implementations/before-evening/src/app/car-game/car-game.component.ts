import { AfterViewInit, Component } from '@angular/core';

import { BeforeEvening, StateUpdate } from '../../../../../src';
import { GameStateService } from '../game-state.service';

import { StatsRenderer } from './statsRenderer';

@Component({
  selector: 'car-game',
  templateUrl: './car-game.component.html',
  styleUrls: ['./car-game.component.scss'],
})
export class CarGameComponent implements AfterViewInit {
  public currentState: StateUpdate;
  public skipRender: boolean;
  public readonly doNotRenderStats: boolean;

  private beforeEvening: BeforeEvening;

  constructor(private gameStateService: GameStateService) {
    this.doNotRenderStats = true;
  }

  public toggleSkipRender() {
    this.beforeEvening.toggleSkipRender(this.skipRender);
  }

  ngAfterViewInit() {
    this.beforeEvening = new BeforeEvening();
    this.gameStateService.beforeEvening = this.beforeEvening;

    this.gameStateService.associateStateUpdater(this.beforeEvening.stateUpdate);
    const width = document.querySelector('.left-side').clientWidth * 0.6;
    this.beforeEvening.runGame({
      width: width.toString(),
      height: ((width * 3) / 4).toString(),
    });

    let statsContainer: StatsRenderer;
    if (!this.doNotRenderStats) {
      statsContainer = new StatsRenderer(this.beforeEvening.stats);
    }

    this.beforeEvening.stateUpdate.subscribe((state) => {
      this.currentState = state;

      if (!this.doNotRenderStats && statsContainer) {
        statsContainer.updateStats(
          this.beforeEvening.stats.ms,
          this.beforeEvening.stats.msMin,
          this.beforeEvening.stats.msMax,
          this.beforeEvening.stats.fps,
          this.beforeEvening.stats.fpsMin,
          this.beforeEvening.stats.fpsMax
        );
      }
    });

    this.gameStateService.refreshGame.subscribe(() => {
      this.beforeEvening.resetGame();
    });
  }
}
