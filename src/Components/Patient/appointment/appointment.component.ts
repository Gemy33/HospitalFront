import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../../../Core/patient.service';

interface TransformedAppointment {
  id: number;
  date: string;           // from consultionTime
  doctorId: number;
  price: number;
  status: string;         // 'Confirmed' or 'Pending'
}

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment.component.html',
  styleUrl: './appointment.component.css'
})
export class AppointmentComponent implements OnInit {

  appointments: TransformedAppointment[] = [];
  loading = true;

  constructor(private PatientService: PatientService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading = true;

    this.PatientService.getAppointments(3).subscribe({
      next: (data: TransformedAppointment[]) => {
        console.log('Raw appointments data:', data);
        this.appointments = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        this.loading = false;
      }
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    return status.toLowerCase() === 'confirmed' ? 'confirmed' : 'pending';
  }
}