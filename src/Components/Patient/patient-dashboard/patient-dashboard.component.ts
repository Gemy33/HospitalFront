import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatientService } from '../../../Core/patient.service';

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.css'
})
export class PatientDashboardComponent implements OnInit {

  patientName = 'Mohamed';
  upcomingAppointments: any[] = [];
  stats: StatCard[] = [];

  constructor(private patientservice: PatientService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // Load only upcoming appointments (limit 3)
    this.patientservice.getAppointments(this.patientId).subscribe({
      next: (appointments) => {
        // Sort by date and take only upcoming ones
        const now = new Date();
        this.upcomingAppointments = appointments
          .filter(app => new Date(app.date) > now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);
      }
    });

    // Static stats for now (you can make them dynamic later)
    this.stats = [
      { title: 'Total Appointments', value: 12, icon: '📅', color: '#3b82f6' },
      { title: 'Upcoming', value: this.upcomingAppointments.length, icon: '⏰', color: '#eab308' },
      { title: 'Completed', value: 9, icon: '✅', color: '#22c55e' }
    ];
  }

  // For demo - change this to real patientId from auth later
  get patientId(): number {
    return 3;
  }
}