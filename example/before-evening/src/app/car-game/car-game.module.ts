import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarGameComponent } from './car-game.component';



@NgModule({
  declarations: [CarGameComponent],
  exports: [
    CarGameComponent
  ],
  imports: [
    CommonModule
  ]
})
export class CarGameModule { }
