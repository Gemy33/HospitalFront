import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrescriptionAnalyticsComponent } from './prescription-analytics.component';

describe('PrescriptionAnalyticsComponent', () => {
  let component: PrescriptionAnalyticsComponent;
  let fixture: ComponentFixture<PrescriptionAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrescriptionAnalyticsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrescriptionAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
