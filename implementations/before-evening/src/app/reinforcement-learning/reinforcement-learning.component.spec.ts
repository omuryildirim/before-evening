import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReinforcementLearningComponent } from './reinforcement-learning.component';

describe('ReinforcementLearningComponent', () => {
  let component: ReinforcementLearningComponent;
  let fixture: ComponentFixture<ReinforcementLearningComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReinforcementLearningComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReinforcementLearningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
