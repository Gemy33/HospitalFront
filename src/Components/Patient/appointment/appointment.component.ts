
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { PatientService, IAppointment } from '../../../Core/patient.service';
import { AuthService } from '../../../Core/auth.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './appointment.component.html',
  styleUrls: ['./appointment.component.css'],
})
export class AppointmentsComponent implements OnInit, OnDestroy {

  appointments = signal<IAppointment[]>([]);
  loading      = signal(false);
  error        = signal<string | null>(null);
  now          = signal(new Date());

   patientId = 2004;
  private ticker: any;

  // ── Enum reference ──────────────────────────────────────────
  // Pending   = 0
  // Confirmed = 1
  // Completed = 2
  // Cancelled = 3

  all = computed(() =>
    this.appointments()
      .slice()
      .sort((a, b) =>
        new Date(a.doctorAvailability.availableFrom).getTime() -
        new Date(b.doctorAvailability.availableFrom).getTime()
      )
  );

  upcoming = computed(() =>
    this.all().filter(a =>
      a.status !== 3 &&   // not cancelled
      a.status !== 2 &&   // not completed
      this.sessionEnd(a) >= this.now()
    )
  );

  completed = computed(() =>
    this.all().filter(a => a.status === 2)
  );

  cancelled = computed(() =>
    this.all().filter(a => a.status === 3)
  );

  constructor(
    private appointmentSvc: PatientService,
    private router: Router,
    private authservice : AuthService,
  ) {}

  ngOnInit(): void {
    const userId = this.authservice.getUserId()!;
    this.appointmentSvc.getPatientProfileByUserId(userId).subscribe({
      next: (res: any) => {
        this.patientId = res.id;
        console.log(this.patientId, 'Patient Id');
        this.load();
      }
    });
    
    // this.load();
    this.ticker = setInterval(() => this.now.set(new Date()), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.ticker);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.appointmentSvc.getAppointments(this.patientId).subscribe({
      
      
      next:  data => { 
        console.log(data , "from load in appointment");
        console.log(this.patientId,"Patient Id in appointment");
        
        this.appointments.set(data); this.loading.set(false); },
      error: ()   => { this.error.set('Failed to load appointments.'); this.loading.set(false); },
    });
  }

  // ── Time helpers ────────────────────────────────────────────

  sessionEnd(a: IAppointment): Date {
    const start = new Date(a.doctorAvailability.availableFrom);
    return new Date(start.getTime() + a.doctorAvailability.sessionDurationMinutes * 60000);
  }

  minutesUntilStart(a: IAppointment): number {
    const start = new Date(a.doctorAvailability.availableFrom);
    return (start.getTime() - this.now().getTime()) / 60000;
  }

  isLive(a: IAppointment): boolean {
    if (a.status === 3 || a.status === 2) return false;
    const start = new Date(a.doctorAvailability.availableFrom);
    return (
      this.now() >= new Date(start.getTime() - 5 * 60000) &&
      this.now() <= this.sessionEnd(a)
    );
  }

  isSoon(a: IAppointment): boolean {
    if (a.status === 3 || a.status === 2) return false;
    const mins = this.minutesUntilStart(a);
    return mins > 5 && mins <= 60;
  }

  isPast(a: IAppointment): boolean {
    return this.sessionEnd(a) < this.now() && a.status !== 3;
  }

  countdown(a: IAppointment): string {
    const mins = this.minutesUntilStart(a);
    if (mins <= 0) return '';
    if (mins < 1) {
      const secs = Math.floor(
        (new Date(a.doctorAvailability.availableFrom).getTime() - this.now().getTime()) / 1000
      );
      return `${secs}s`;
    }
    if (mins < 60) return `${Math.floor(mins)}m`;
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  meetingUrl(a: IAppointment): string {
    console.log("patient",a.id);

    return `https://meet.jit.si/MedFinder-Appointment-${a.doctorAvailabilityId}`;
  }

  joinMeeting(a: IAppointment): void {
    window.open(this.meetingUrl(a), '_blank');
  }

  // ── Card class ──────────────────────────────────────────────

  cardClass(a: IAppointment): string {
    if (a.status === 3)     return 'ap-card--cancelled';  // Cancelled
    if (a.status === 2)     return 'ap-card--past';       // Completed
    if (this.isPast(a))     return 'ap-card--past';       // session ended
    if (this.isLive(a))     return 'ap-card--live';       // live now
    if (this.isSoon(a))     return 'ap-card--soon';       // within 60 min
    if (a.status === 1)     return 'ap-card--confirmed';  // Confirmed future
    return 'ap-card--pending';                            // Pending payment
  }

  // ── Status helpers ──────────────────────────────────────────

  statusLabel(status: number): string {
    switch (status) {
      case 0:  return 'Pending';
      case 1:  return 'Confirmed';
      case 2:  return 'Completed';
      case 3:  return 'Cancelled';
      default: return 'Unknown';
    }
  }

  statusClass(status: number): string {
    switch (status) {
      case 0:  return 'status--pending';
      case 1:  return 'status--confirmed';
      case 2:  return 'status--completed';
      case 3:  return 'status--cancelled';
      default: return 'status--pending';
    }
  }

  // ── Format helpers ──────────────────────────────────────────

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
  }

  formatDayNum(iso: string): string {
    return new Date(iso).getDate().toString();
  }

  formatMonth(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short' });
  }

  endTime(iso: string, mins: number): string {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() + mins);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  getDoctorInitials(doctorId: number): string {
    return `D${doctorId}`;
  }

  viewPrescriptions(): void {
    this.router.navigate(['/patient/prescription']);
  }
}