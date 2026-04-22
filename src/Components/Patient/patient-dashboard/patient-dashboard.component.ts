import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatientService } from '../../../Core/patient.service';
import { map } from 'rxjs';
import { AuthService } from '../../../Core/auth.service';

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
   upcomming = 0
     completed = 0
     total = 0

  constructor(private patientservice: PatientService , private authservice: AuthService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }
   
    

  loadDashboardData(): void {
    // Load only upcoming appointments (limit 3)
    var id = this.authservice.getUserId()!;
    console.log("id user" , id);
    
    this.patientservice.getPatientProfileByUserId(id).subscribe({
      next: (data) => {
        this.patientName = data.name;
        id = data.id;
        console.log("patient name from dashboard", this.patientName);
        console.log("patient Id from dashboard", data.id);


      },
      error: () => {
        console.log('Failed to load profile. Please try again.');
      }
    });
    this.patientservice.getAppointments(id).subscribe({
      next: (appointments) => {
         this.total = appointments.length
         console.log(appointments);
       
         
         
        appointments.forEach((app) => {
          if (app.status === 'Pending') {
            this.upcomming++;
          } else if (app.status === 'Completed') {
            this.completed++;
          }
        });
        // Sort by date and take only upcoming ones
        const now = new Date();
        this.upcomingAppointments = appointments
          .filter(app => new Date(app.date) > now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);
      }
    });

    // get total appointments count (for demo, using static value here, you can calculate from API data later)

   
   
    // var appointmens = this.patientservice.getAppointments(this.patientId).subscribe({
    //   next: (appointments) => {
    //     total = appointments.length
    //     appointments.forEach((app) => {
    //       if (app.status === 'Pending') {
    //         upcomming++;
    //       } else if (app.status === 'Completed') {
    //         completed++;
    //       }
    //     });
    //     console.log(appointments);
    //   }
    // });
    // Static stats for now (you can make them dynamic later)
    this.stats = [
      { title: 'Total Appointments', value: this.total, icon: '📅', color: '#3b82f6' },
      { title: 'Upcoming', value: this.upcomming, icon: '⏰', color: '#eab308' },
      { title: 'Completed', value: this.  completed, icon: '✅', color: '#22c55e' }
    ];
  }

  // For demo - change this to real patientId from auth later
   patientId(): number {
   return 3;
  }
}