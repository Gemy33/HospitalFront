import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DoctorService } from '../../../Core/doctor.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DoctorProfile {
  id: number;
  name: string;
  speciality: string;
  gender: number;        // 1 = Male, 2 = Female, 0 = Other
  yearsOfExperience: number;
  bio: string;
  phone: string;
}

export interface StatCard {
  label: string;
  value: string;
  iconPath: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

export interface WeekDay {
  short: string;
  full: string;
  available: boolean;
  isToday: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './doctor-profile.component.html',
  styleUrls: ['./doctor-profile.component.css'],
})
export class DoctorProfileComponent implements OnInit {

  // ── State ────────────────────────────────────────────────────────────────────

  isLoading = false;

  /** Doctor profile populated from API */
  doctor: DoctorProfile = {
    id: 2,
    name: 'ahmed123',
    speciality: 'Cardiology',
    gender: 1,
    yearsOfExperience: 10,
    bio: 'Cardiologist with strong experience in heart disease diagnosis and treatment.',
    phone: '+201001234567',
  };

  /** Quick stat cards shown in the stats row */
  profileStats: StatCard[] = [];

  /** Availability chips for the week */
  weekDays: WeekDay[] = [];
  _doctorservice:DoctorService=inject(DoctorService);


  // ── API Config ───────────────────────────────────────────────────────────────
  // private readonly API_URL = '/api/doctor/profile'; // replace with your base URL

  
  constructor(private http: HttpClient ,private route:ActivatedRoute )  {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
   const doctorId = this.route.snapshot.paramMap.get('id');
    this._doctorservice.getDoctorProfile(doctorId).subscribe({
      next:(res)=>{console.log(res);
        console.log("im in the doctor profile.ts")
      },
      error:(err)=>console.log(err)
    });
    this.buildWeekDays();
  }

  // ── Data Loading ─────────────────────────────────────────────────────────────

  /**
   * Fetch doctor profile from the API.
   * Falls back to the default data if the request fails (e.g. in dev).
   *
   * Replace `this.API_URL` with your actual endpoint, e.g.:
   *   GET /api/doctors/me          (authenticated current user)
   *   GET /api/doctors/:id         (specific doctor by ID)
   */
  // loadProfile(): void {
  //   this.isLoading = true;

  //   this.http.get<DoctorProfile>(this.API_URL).subscribe({
  //     next: (data) => {
  //       this.doctor = data;
  //       this.buildStats();
  //       this.isLoading = false;
  //     },
  //     error: () => {
  //       // Use default data in dev / fallback
  //       this.buildStats();
  //       this.isLoading = false;
  //     },
  //   });
  // }

  // ── Helper: Display ──────────────────────────────────────────────────────────

  /**
   * Derive initials from raw name (handles usernames like "ahmed123").
   * For a real name like "Ahmed Hassan" → "AH", for "ahmed123" → "AH".
   */
  getInitials(name: string): string {
    const cleaned = name.replace(/\d+/g, '').trim();
    const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase() || 'DR';
  }

  /**
   * Format raw username to a display-friendly name.
   * "ahmed123" → "Dr. Ahmed" (strips trailing digits, capitalises).
   * Real full names are passed through untouched.
   */
  formatName(name: string): string {
    const cleaned = name.replace(/\d+$/, '').trim();
    if (cleaned.toLowerCase().startsWith('dr')) return cleaned;
    const capitalised = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    return `Dr. ${capitalised}`;
  }

  /** Map gender integer to readable label */
  getGenderLabel(gender: number): string {
    const map: Record<number, string> = { 1: 'Male', 2: 'Female', 0: 'Other' };
    return map[gender] ?? 'Not specified';
  }

  /** Zero-pad doctor ID for display (e.g. 2 → "0002") */
  padId(id: number): string {
    return String(id).padStart(4, '0');
  }

  // ── Helper: Experience ───────────────────────────────────────────────────────

  /** Descriptive level label based on years */
  getExperienceLevel(): string {
    const y = this.doctor.yearsOfExperience;
    if (y < 3)  return 'Junior';
    if (y < 7)  return 'Mid';
    if (y < 13) return 'Senior';
    return 'Expert';
  }

  /** CSS class suffix for the level badge color */
  getExperienceLevelClass(): string {
    return this.getExperienceLevel().toLowerCase();
  }

  /** Convert years to a 0–100% bar fill (max anchored at 20 years) */
  getExperiencePercent(): number {
    return Math.min((this.doctor.yearsOfExperience / 20) * 100, 100);
  }

  // ── Private Builders ─────────────────────────────────────────────────────────

  /**
   * Build the 3 stat cards shown in the stats grid.
   * In production, fetch real totals from:
   *   GET /api/doctors/:id/stats  → { totalPatients, totalConsultations, rating }
   */
  private buildStats(): void {
    this.profileStats = [
      {
        label: 'Years Active',
        value: `${this.doctor.yearsOfExperience}`,
        iconPath: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z',
        iconBg: 'rgba(26,77,122,0.09)',
        iconColor: '#1a4d7a',
        valueColor: '#1a4d7a',
      },
      {
        label: 'Speciality',
        value: this.doctor.speciality,
        iconPath: 'M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 6.9 8 11.7zM12 12a2 2 0 110-4 2 2 0 010 4z',
        iconBg: 'rgba(184,134,42,0.09)',
        iconColor: '#b8862a',
        valueColor: '#b8862a',
      },
      {
        label: 'Experience',
        value: this.getExperienceLevel(),
        iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
        iconBg: 'rgba(26, 61, 43, 0.08)',
        iconColor: '#2a5c40',
        valueColor: '#2a5c40',
      },
    ];
  }

  /**
   * Build the availability week strip.
   * In production, fetch real availability from:
   *   GET /api/doctors/:id/availability
   */
  private buildWeekDays(): void {
    const today = new Date().getDay(); // 0 = Sunday
    const days = [
      { short: 'Sun', full: 'Sunday' },
      { short: 'Mon', full: 'Monday' },
      { short: 'Tue', full: 'Tuesday' },
      { short: 'Wed', full: 'Wednesday' },
      { short: 'Thu', full: 'Thursday' },
      { short: 'Fri', full: 'Friday' },
      { short: 'Sat', full: 'Saturday' },
    ];

    // Placeholder: mark Mon–Thu available; replace with real API data
    const availableDays = [1, 2, 3, 4];

    this.weekDays = days.map((d, i) => ({
      ...d,
      available: availableDays.includes(i),
      isToday: i === today,
    }));
  }

  // ── UI Actions ───────────────────────────────────────────────────────────────

  /**
   * Open the edit profile modal / navigate to edit route.
   * In production you might emit an event or use a dialog service:
   *   this.dialogService.open(EditProfileDialogComponent, { data: this.doctor });
   */
  openEditModal(): void {
    console.log('[DoctorProfile] Open edit modal for doctor:', this.doctor.id);
    // Example: this.router.navigate(['/doctor/profile/edit']);
  }
}