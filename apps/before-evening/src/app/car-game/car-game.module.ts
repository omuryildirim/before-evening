import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CarGameComponent } from './car-game.component';

@NgModule({
  declarations: [CarGameComponent],
  exports: [CarGameComponent],
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class CarGameModule {}
