// payment-cancelled.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-cancelled',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pc-root">
      <div class="pc-box">
        <div class="pc-icon">✕</div>
        <h2>Payment Cancelled</h2>
        <p>Your appointment was not confirmed. No charge was made.</p>
        <button (click)="go()">Back to Doctors</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --bg: #0d1117; --surface: #161b25; --red: #f87171;
      --red-bg: rgba(248,113,113,0.09); --red-bd: rgba(248,113,113,0.22);
      --t1: #e6edf3; --t2: #7d8ea1; --font: 'Sora', system-ui, sans-serif;
    }
    .pc-root {
      min-height: 100vh; background: var(--bg);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font);
    }
    .pc-box {
      background: var(--surface); border: 1px solid var(--red-bd);
      border-radius: 16px; padding: 48px 40px; max-width: 400px;
      width: 100%; text-align: center; display: flex;
      flex-direction: column; align-items: center; gap: 14px;
    }
    .pc-icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--red-bg); border: 1px solid var(--red-bd);
      color: var(--red); font-size: 24px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    h2 { margin: 0; color: var(--t1); font-size: 20px; font-weight: 700; }
    p  { margin: 0; color: var(--t2); font-size: 14px; line-height: 1.6; }
    button {
      margin-top: 8px; background: var(--red-bg); border: 1px solid var(--red-bd);
      color: var(--red); font-family: var(--font); font-size: 13px;
      font-weight: 600; padding: 10px 24px; border-radius: 8px; cursor: pointer;
    }
    button:hover { background: var(--red); color: #0d1117; }
  `]
})
export class PaymentCancelledComponent {
  constructor(private router: Router) {}
  go() { this.router.navigate(['/patient/find-doctors']); }
}