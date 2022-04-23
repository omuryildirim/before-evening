import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CarGameComponent } from './car-game.component';

describe('CarGameComponent', () => {
  let component: CarGameComponent;
  let fixture: ComponentFixture<CarGameComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CarGameComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CarGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
