import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../Core/auth.service';
import { PatientService } from '../../../Core/patient.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  active?: boolean;
}

@Component({
  selector: 'app-patient-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-navbar.component.html',
  styleUrls: ['./patient-navbar.component.scss'],
})
export class PatientNavbarComponent {

  /**
   *
   */
  constructor(private authservice : AuthService , private patientservice : PatientService) {
    
  }

    patientName = 'Mohamed';        // You can make this dynamic later
  patientId = 3;
  
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


  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: '🏠', route: '/patient/dashboard', active: true },
    { label: 'Profile', icon: '👤', route: '/patient/profile' },
    { label: 'My Appointments', icon: '📅', route: '/patient/appointments' },
    { label: 'Prescription', icon: '💊', route: '/patient/prescription' },
    // { label: 'Medical History', icon: '📋', route: '/patient/history' },
    { label: 'Doctors', icon: '🩺', route: '/patient/find-doctors' },
    { label: 'Settings', icon: '⚙️', route: '/patient/settings' }
  ];

  setActive(route: string): void {
    this.menuItems.forEach(item => {
      item.active = item.route === route;
    });
  }
}