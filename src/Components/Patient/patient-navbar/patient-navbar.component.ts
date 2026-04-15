import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface NavItem {
  label: string;
  subtitle: string;
  route: string;
  icon: SafeHtml;   // ✅ CHANGED ONLY THIS
  iconClass: string;
  badge?: number | string;
  badgeClass?: string;
}

@Component({
  selector: 'app-patient-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-navbar.component.html',
  styleUrls: ['./patient-navbar.component.scss'],
})
export class PatientNavbarComponent implements OnInit {

  @Input() patientName: string = 'Ahmed Hassan';
  @Input() patientId: string = 'PT-20941';
  @Input() isOnline: boolean = true;

  isCollapsed = false;

  constructor(private sanitizer: DomSanitizer) {}

  navItems: NavItem[] = [
    {
      label: 'My Profile',
      subtitle: 'Personal info & settings',
      route: '/patient/profile',
      iconClass: 'icon-profile',
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2
                   9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4
                   c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      `)
    },

    {
      label: 'Prescriptions',
      subtitle: 'View active medications',
      route: '/patient/prescriptions',
      iconClass: 'icon-prescription',
      badge: 3,
      badgeClass: 'badge-teal',
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2
                   16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      `)
    },

    {
      label: 'Appointments',
      subtitle: 'Schedule & upcoming',
      route: '/patient/appointments',
      iconClass: 'icon-appointment',
      badge: 2,
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
          <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99
                   2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3
                   18H5V8h14v11z"/>
        </svg>
      `)
    },

    {
      label: 'Find Doctors',
      subtitle: 'Search specialists',
      route: '/patient/find-doctors',
      iconClass: 'icon-doctors',
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
          <path d="M20 6h-2.18c.07-.44.18-.88.18-1.34C18 2.54 15.96.5 13.46.5
                   12.17.5 11 1.04 10.17 1.88 9.33 1.04 8.17.5 6.88.5 4.38.5 2.34 2.54
                   2.34 5.04c0 .46.1.9.18 1.34H.5L1 20c0 1.1.9 2 2 2h18c1.1 0 2-.9
                   2-2l.5-14h-3.5zm-2.5-1c0 .55-.45 1-1 1h-2V4h2c.55 0 1 .45 1
                   1zm-8.5 8.5l3.5-3.5 3.5 3.5-1.06 1.06L12 13.12l-2.44 2.44L8.5
                   14.5zm-3-8.5h2v1.5h-2c-.55 0-1-.45-1-1s.45-1 1-1z"/>
        </svg>
      `)
    },
  ];

  ngOnInit(): void {}

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase() ?? '')
      .join('');
  }

  logout(): void {
    console.log('Logging out…');
  }
}