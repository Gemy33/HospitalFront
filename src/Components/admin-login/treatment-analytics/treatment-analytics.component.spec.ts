import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentAnalyticsComponent } from './treatment-analytics.component';

describe('TreatmentAnalyticsComponent', () => {
  let component: TreatmentAnalyticsComponent;
  let fixture: ComponentFixture<TreatmentAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentAnalyticsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreatmentAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
