import { Component, computed, OnInit, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatientService } from '../../../Core/patient.service';
import { map, single } from 'rxjs';
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
  patientId = 0;
  upcomingAppointments: any[] = [];
  stats: Signal<StatCard[]> = signal([]);
  upcoming = signal(0);
   completed = signal(0);
    total = signal(0 );
  

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
        this.patientId = data.id;
        console.log("patient name from dashboard", this.patientName);
        console.log("patient Id from dashboard", this.patientId);
this.patientservice.getAppointments(this.patientId).subscribe({
      next: (appointments) => {

         this.total.set(appointments.length);
         console.log(this.total(),"total appointments");
         
         console.log(appointments);
       
         
         
        appointments.forEach((app) => {
          if (app.status ==1) {

            this.upcoming.set(this.upcoming() + 1);
          } else if (app.status === 2) {
            this.completed.set(this.completed() + 1)    ;
          }
        });
        // Sort by date and take only upcoming ones
        const now = new Date();
        this.upcomingAppointments = appointments
          .filter(app => new Date(app.consultionTime) > now)
          .sort((a, b) => new Date(a.consultionTime).getTime() - new Date(b.consultionTime).getTime())
          .slice(0, 3);
      }
    });

      },
      error: () => {
        console.log('Failed to load profile. Please try again.');
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
    this.stats = computed(() => [
      { title: 'Upcoming Appointments', value: this.upcoming(), icon: '📅', color: 'blue' },
      { title: 'Completed Appointments', value: this.completed(), icon: '✅', color: 'green' },
      { title: 'Total Appointments', value: this.total(), icon: '📊', color: 'purple' },
    ]);
     
 
  
  }

  // For demo - change this to real patientId from auth later
  //  patientId(): number {
  //  return 2003;
  // }
}