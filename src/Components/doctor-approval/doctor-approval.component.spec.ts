import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorApprovalComponent } from './doctor-approval.component';

describe('DoctorApprovalComponent', () => {
  let component: DoctorApprovalComponent;
  let fixture: ComponentFixture<DoctorApprovalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorApprovalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DoctorApprovalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
