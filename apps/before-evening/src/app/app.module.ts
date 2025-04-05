import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CarGameModule } from './car-game/car-game.module';
import { GameStateService } from './game-state.service';
import { ReinforcementLearningModule } from './reinforcement-learning/reinforcement-learning.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReinforcementLearningModule,
    CarGameModule,
  ],
  providers: [GameStateService],
  bootstrap: [AppComponent],
})
export class AppModule {}
