
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '../../../Core/patient.service';


@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css'],
})
export class PaymentSuccessComponent implements OnInit {

  status = signal<'loading' | 'success' | 'error'>('loading');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patineservice: PatientService,
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (!sessionId) {
      console.log(sessionId , "setionId");
      
      this.status.set('error');
      return;
    }
    this.patineservice.confirmBooking(sessionId).subscribe({
      next: () => {
        console.log('Booking confirmed successfully!' , "Session ID:", sessionId);
        this.status.set('success');
        // Redirect to appointments after 3 seconds
        setTimeout(() => this.router.navigate(['/patient/appointments']), 3000);
      },
      error: (err) =>
        {console.error('Error confirming booking:', err);
         this.status.set('error')},
    });
  }

  goToAppointments(): void {
    this.router.navigate(['/patient/appointments']);
  }
}