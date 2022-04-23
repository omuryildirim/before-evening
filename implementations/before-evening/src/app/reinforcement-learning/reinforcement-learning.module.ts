import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ReinforcementLearningComponent } from './reinforcement-learning.component';

@NgModule({
  declarations: [ReinforcementLearningComponent],
  exports: [ReinforcementLearningComponent],
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class ReinforcementLearningModule {}
