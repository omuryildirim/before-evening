import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarGameComponent } from './car-game.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";



@NgModule({
  declarations: [CarGameComponent],
  exports: [
    CarGameComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class CarGameModule { }
