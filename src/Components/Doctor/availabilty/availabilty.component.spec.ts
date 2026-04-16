import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvailabiltyComponent } from './availabilty.component';

describe('AvailabiltyComponent', () => {
  let component: AvailabiltyComponent;
  let fixture: ComponentFixture<AvailabiltyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvailabiltyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AvailabiltyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
