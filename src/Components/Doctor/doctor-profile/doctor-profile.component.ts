import { Doctor } from './../../../Core/patient.service';
import { Speciality } from './../../Patient/find-doctor/find-doctor.component';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DoctorService } from '../../../Core/doctor.service';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DoctorProfile } from '../../../Core/Interfaces/Doctor/doctor-profile';
import { AuthService } from '../../../Core/auth.service';
import { cwd } from 'process';

// ── Interfaces ────────────────────────────────────────────────────────────────



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
  imports: [CommonModule, RouterModule, HttpClientModule,ReactiveFormsModule,RouterLink],
  templateUrl: './doctor-profile.component.html',
  styleUrls: ['./doctor-profile.component.css'],
})
export class DoctorProfileComponent implements OnInit {

  // ── State ────────────────────────────────────────────────────────────────────

  isLoading = false;

  // ── Edit modal state (only addition — no logic changes) ───────────────────
  editModalOpen = false;

  /** Doctor profile populated from API */
  doctor: DoctorProfile = {
    id: 2,
    name: 'ahmed123',
    speciality: "Cardiologist",
    gender: 1,
    yearsOfExperience: 10,
    bio: 'Cardiologist with strong experience in heart disease diagnosis and treatment.',
    phone: '+201001234567',
  };

  /** Quick stat cards shown in the stats row */
  profileStats: StatCard[] = [];

  /** Availability chips for the week */
  weekDays: WeekDay[] = [];
  _doctorservice: DoctorService = inject(DoctorService);

  constructor(private http: HttpClient,private _authservice:AuthService, private route: ActivatedRoute,private fb: FormBuilder,private _router: Router) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  Edit:FormGroup=this.fb.group({
      Name: ['', Validators.required],
      Id: [, [Validators.required, Validators.pattern('^[0-9]+$')]],
      specialityId: [3, [Validators.required, Validators.min(1)]],
      phone:[this.doctor.phone,Validators.required],
      yearsOfExperienc: [5, [Validators.required, Validators.min(0), Validators.max(50)]],
      bio: ['Experienced professional with a strong background in the field.', Validators.maxLength(500)]
    });
   

  ngOnInit(): void {
    this.loadProfile();
    this.buildWeekDays();
    
   
  }

  // ── Data Loading ─────────────────────────────────────────────────────────────

  loadProfile(): void {
    this.isLoading = true;
    const doctorId = this.route.snapshot.paramMap.get('id');
    this._doctorservice.getDoctorProfile(doctorId).subscribe({
      next: (data) => {
        console.log(data);
        this.doctor = data;
        this.buildStats();
        this.isLoading = false;
      },
      error: () => {
        this.buildStats();
        this.isLoading = false;
      },
    });
  }
  EditProfile():void{
   this.Edit.value.Id=this._authservice.Id;
   console.log("edit",this.Edit);
    this._doctorservice.updateDoctorProfile(this.Edit.value).subscribe({
      next:(res)=>{
        this.loadProfile();
      },
      error:(err)=>console.log(err)
    });
    console.log(this.Edit)
    console.log("his im islam")
  }
 

  fillForm() {
  if (!this.doctor) return;
 

  this.Edit.patchValue({
    Name: this.doctor.name,
    Id: this.doctor.id,
    Speciality: this.doctor.speciality,
    phone: this.doctor.phone,
    yearsOfExperienc: this.doctor.yearsOfExperience,
    bio: this.doctor.bio,
    gender: this.doctor.gender
  });
}

  // ── Edit modal ────────────────────────────────────────────────────────────────

  openEditModal(): void {
    this.fillForm();
    this.editModalOpen = true;
    document.body.style.overflow = 'hidden';

  }

  closeEditModal(): void {
    this.editModalOpen = false;
    document.body.style.overflow = '';
  }

  // ── Helper: Display ──────────────────────────────────────────────────────────

  getInitials(name: string): string {
    const cleaned = name.replace(/\d+/g, '').trim();
    const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase() || 'DR';
  }

  formatName(name: string): string {
    const cleaned = name.replace(/\d+$/, '').trim();
    if (cleaned.toLowerCase().startsWith('dr')) return cleaned;
    const capitalised = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    return `Dr. ${capitalised}`;
  }

  getGenderLabel(gender: number): string {
    const map: Record<number, string> = { 1: 'Male', 2: 'Female', 0: 'Other' };
    return map[gender] ?? 'Not specified';
  }

  padId(id: number): string {
    return String(id).padStart(4, '0');
  }

  // ── Helper: Experience ───────────────────────────────────────────────────────

  getExperienceLevel(): string {
    const y = this.doctor.yearsOfExperience;
    if (y < 3)  return 'Junior';
    if (y < 7)  return 'Mid';
    if (y < 13) return 'Senior';
    return 'Expert';
  }

  getExperienceLevelClass(): string {
    return this.getExperienceLevel().toLowerCase();
  }

  getExperiencePercent(): number {
    return Math.min((this.doctor.yearsOfExperience / 20) * 100, 100);
  }

  // ── Private Builders ─────────────────────────────────────────────────────────

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

  private buildWeekDays(): void {
    const today = new Date().getDay();
    const days = [
      { short: 'Sun', full: 'Sunday' },
      { short: 'Mon', full: 'Monday' },
      { short: 'Tue', full: 'Tuesday' },
      { short: 'Wed', full: 'Wednesday' },
      { short: 'Thu', full: 'Thursday' },
      { short: 'Fri', full: 'Friday' },
      { short: 'Sat', full: 'Saturday' },
    ];
    const availableDays = [1, 2, 3, 4];
    this.weekDays = days.map((d, i) => ({
      ...d,
      available: availableDays.includes(i),
      isToday: i === today,
    }));
  }
}