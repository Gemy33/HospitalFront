import { Component, computed, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../Core/auth.service';
import { PatientService } from '../../../Core/patient.service';

export interface SidebarItem {
  label: string;
  hint: string;
  route: string;
  badge?: number;
  badgeColor?: 'blue' | 'amber' | 'green' | 'red';
  svgPath: string;
}

@Component({
  selector: 'app-patient-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-navbar.component.html',
  styleUrls: ['./patient-navbar.component.scss'],
})
export class PatientNavbarComponent {

  @Input() patientName = 'Ahmed Hassan';
  @Input() patientId   = 'PT-20941';
  @Input() isOnline    = true;

  slim = signal(false);

  readonly menuItems: SidebarItem[] = [
     {
      label: 'Dashboard',
      hint:  'Overview of your health & activities',
      route: '/patient/dashboard',
      svgPath: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    },
    {
      label: 'My Profile',
      hint:  'Personal info & settings',
      route: '/patient/profile',
      svgPath: 'M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    },
    {
      label: 'Find Doctors',
      hint:  'Search specialists near you',
      route: '/patient/find-doctors',
      svgPath: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z',
    },
    {
      label: 'Appointments',
      hint:  'Schedule & upcoming visits',
      route: '/patient/appointments',
      badge: 2,
      badgeColor: 'amber',
      svgPath: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    },
    {
      label: 'Prescriptions',
      hint:  'Active medications',
      route: '/patient/prescription',
      badge: 3,
      badgeColor: 'blue',
      svgPath: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    },
  ];

  initials = computed(() =>
    this.patientName.trim().split(/\s+/).slice(0, 2)
      .map(w => w[0].toUpperCase()).join('')
  );
  constructor(private authservice : AuthService , private patientservice : PatientService) {
    
  }


  
   userId = this.authservice.getUserId()!;
   profile = this.patientservice.getPatientProfileByUserId(this.userId).subscribe({
    next: (data) => {
      this.patientName = data.name.split(' ')[0]; // Get first name for display
      this.patientId = data.id;
      console.log("patient name from navbar", this.patientName);
      console.log("patient Id from navbar", data.id);
    },
    error: () => {
      console.log('Failed to load profile. Please try again.');
    }
  });


  logout(): void { console.log('logout'); }
toggle(): void { this.slim.update(v => !v); }
  // setActive(route: string): void {
  //   this.menuItems.forEach(item => {
  //     item.active = item.route === route;
  //   });
  // }
}