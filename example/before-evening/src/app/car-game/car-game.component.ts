import { AfterViewInit, Component } from '@angular/core';
import { BeforeEvening } from 'before-evening';
import { GameStateService } from '../game-state.service';
import { StateUpdate } from 'before-evening/build/main/interfaces/state.interfaces';
import { StatsRenderer } from './statsRenderer';

@Component({
  selector: 'car-game',
  templateUrl: './car-game.component.html',
  styleUrls: ['./car-game.component.scss']
})
export class CarGameComponent implements AfterViewInit {
  public currentState: StateUpdate;
  public skipRender: boolean;

  private beforeEvening: BeforeEvening;

  constructor(private gameStateService: GameStateService) {
  }

  public toggleSkipRender() {
    this.beforeEvening.toggleSkipRender(this.skipRender);
  }

  ngAfterViewInit() {
    this.beforeEvening = new BeforeEvening();

    this.gameStateService.associateStateUpdater(this.beforeEvening.stateUpdate);
    this.beforeEvening.runGame();

    const statsContainer = new StatsRenderer(this.beforeEvening.stats);

    this.beforeEvening.stateUpdate.subscribe(state => {
      this.currentState = state;
      statsContainer.updateStats(this.beforeEvening.stats.ms, this.beforeEvening.stats.msMin,
        this.beforeEvening.stats.msMax, this.beforeEvening.stats.fps,
        this.beforeEvening.stats.fpsMin, this.beforeEvening.stats.fpsMax);
    });

    this.gameStateService.refreshGame.subscribe(() => {
      this.beforeEvening.resetGame();
    });
  }
}
