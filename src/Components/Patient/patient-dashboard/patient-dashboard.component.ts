import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatientService } from '../../../Core/patient.service';
import { AuthService } from '../../../Core/auth.service';
import { IAppointment } from '../../../Core/patient.service';
@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.css'
})
export class PatientDashboardComponent implements OnInit {

  // ── State ────────────────────────────────────────────────────
  patientName    = signal('');
  patientId      = signal(0);
  appointments   = signal<IAppointment[]>([]);
  loading        = signal(true);
  error          = signal<string | null>(null);
  greeting       = signal('');

  // ── Computed stats ───────────────────────────────────────────
  total = computed(() => this.appointments().length);

  upcoming = computed(() =>
    this.appointments().filter(a => a.status === 1).length
  );

  completed = computed(() =>
    this.appointments().filter(a => a.status === 2).length
  );

  cancelled = computed(() =>
    this.appointments().filter(a => a.status === 3).length
  );

  // Next 3 upcoming appointments sorted by date
  nextAppointments = computed(() => {
    const now = new Date();
    return this.appointments()
      .filter(a => a.status === 1 && new Date(a.doctorAvailability.availableFrom) > now)
      .sort((a, b) =>
        new Date(a.doctorAvailability.availableFrom).getTime() -
        new Date(b.doctorAvailability.availableFrom).getTime()
      )
      .slice(0, 3);
  });

  constructor(
    private patientSvc: PatientService,
    private authSvc: AuthService,
  ) {}

  ngOnInit(): void {
    this.setGreeting();
    this.load();
  }

  setGreeting(): void {
    const h = new Date().getHours();
    if (h < 12)      this.greeting.set('Good morning');
    else if (h < 18) this.greeting.set('Good afternoon');
    else             this.greeting.set('Good evening');
  }

  load(): void {
    const userId = this.authSvc.getUserId()!;
    this.loading.set(true);
    this.error.set(null);

    this.patientSvc.getPatientProfileByUserId(userId).subscribe({
      next: (profile: any) => {
        this.patientName.set(profile.name);
        this.patientId.set(profile.id);

        this.patientSvc.getAppointments(profile.id).subscribe({
          next: (apts) => {
            this.appointments.set(apts);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Failed to load appointments.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.error.set('Failed to load profile.');
        this.loading.set(false);
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  formatDayNum(iso: string): string {
    return new Date(iso).getDate().toString();
  }

  formatMonth(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short' });
  }

  statusLabel(s: number): string {
    return ['Pending','Confirmed','Completed','Cancelled'][s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return ['pd-chip--pending','pd-chip--confirmed',
            'pd-chip--completed','pd-chip--cancelled'][s] ?? '';
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0,2).map(w => w[0].toUpperCase()).join('');
  }
}