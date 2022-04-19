import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReinforcementLearningComponent} from './reinforcement-learning.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

@NgModule({
  declarations: [
    ReinforcementLearningComponent
  ],
  exports: [
    ReinforcementLearningComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class ReinforcementLearningModule {
}
