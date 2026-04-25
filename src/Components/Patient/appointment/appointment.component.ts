import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../../../Core/patient.service';
import { AuthService } from '../../../Core/auth.service';
import { Router } from '@angular/router';

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

  constructor(private PatientService: PatientService , private route: Router, private authservice : AuthService) {}

  ngOnInit(): void {
      var userId = this.authservice.getUserId();
    if (!userId) {
      console.log('User not authenticated. Please log in.');
      this.loading = false;
      return;
    }
      this.PatientService.getPatientProfileByUserId(userId).subscribe({
      next: (data) => {
        const patientId = data.id;
        console.log("patient id from appointment load", patientId);
        this.loadAppointments(patientId);
      },
        
      error: () => {
        console.log('Failed to load profile. Please try again.');
        this.loading = false;}
    });


    
  }

  loadAppointments(patientId: number): void {
    this.loading = true;

    this.PatientService.getAppointments(patientId).subscribe({
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
naviagetoPresci():void{
  this.route.navigate(['/patient/prescription']);
  console.log("navigating to prescription");
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