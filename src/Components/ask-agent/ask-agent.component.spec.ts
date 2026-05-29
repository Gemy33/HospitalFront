import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AskAgentComponent } from './ask-agent.component';

describe('AskAgentComponent', () => {
  let component: AskAgentComponent;
  let fixture: ComponentFixture<AskAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AskAgentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AskAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
