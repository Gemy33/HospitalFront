import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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

  patientName = 'Mohamed';        // You can make this dynamic later
  patientId = 3;

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: '🏠', route: '/patient/dashboard', active: true },
    { label: 'Profile', icon: '👤', route: '/patient/profile' },
    { label: 'My Appointments', icon: '📅', route: '/patient/appointments' },
    { label: 'Prescriptions', icon: '💊', route: '/patient/prescriptions' },
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