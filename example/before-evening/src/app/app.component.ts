import {AfterViewInit, Component, OnInit} from '@angular/core';
import {BeforeEvening} from "../../../../build/main";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'before-evening';

  ngAfterViewInit() {
    new BeforeEvening();
  }
}
