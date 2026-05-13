import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiSymptomCheckerComponent } from './ai-symptom-checker.component';

describe('AiSymptomCheckerComponent', () => {
  let component: AiSymptomCheckerComponent;
  let fixture: ComponentFixture<AiSymptomCheckerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSymptomCheckerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AiSymptomCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
