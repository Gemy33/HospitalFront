import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../../Core/patient.service';

export interface Doctor {
  id: number;
  name: string | null;
  speciality: string | null;
  gender: number;
  yearsOfExperience: number;
  bio: string;
  phone: string | null;
}

export interface Speciality {
  id: number;
  name: string;
}

@Component({
  selector: 'app-find-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './find-doctor.component.html',
  styleUrls: ['./find-doctor.component.css'],
})
export class FindDoctorComponent implements OnInit {
  allDoctors = signal<Doctor[]>([]);
  displayedDoctors = signal<Doctor[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  searchName = '';
  selectedSpecialityId: number | '' = '';

  // Speciality list — id matches what your API expects
  specialities: Speciality[] = [
    { id: 1,  name: 'Cardiology' },
    { id: 2,  name: 'Dermatology' },
    { id: 3,  name: 'Neurology' },
    { id: 4,  name: 'Orthopedics' },
    { id: 5,  name: 'Pediatrics' },
    { id: 6,  name: 'Ophthalmology' },
    { id: 7,  name: 'Gynecology' },
    { id: 8,  name: 'Psychiatry' },
    { id: 9,  name: 'Gastroenterology' },
    { id: 10, name: 'Endocrinology' },
  ];

  constructor(private _patientservice: PatientService) {}

  ngOnInit(): void {
    this.loadAllDoctors();
  }

  loadAllDoctors(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this._patientservice.getAllDoctors().subscribe({
      next: (doctors) => {
        this.allDoctors.set(doctors);
        this.applyNameFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load doctors. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onSpecialityChange(): void {
    this.searchName = '';
    if (this.selectedSpecialityId === '') {
      this.loadAllDoctors();
    } else {
      this.isLoading.set(true);
      this.error.set(null);
      // passes the numeric id to the API
      this._patientservice.getAllDoctorsBySpeciality(this.selectedSpecialityId as number).subscribe({
        next: (doctors) => {
          this.allDoctors.set(doctors);
          this.displayedDoctors.set(doctors);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Failed to load doctors for this speciality.');
          this.isLoading.set(false);
        },
      });
    }
  }

  onNameSearch(): void {
    this.applyNameFilter();
  }

  private applyNameFilter(): void {
    const term = this.searchName.toLowerCase().trim();
    if (!term) {
      this.displayedDoctors.set(this.allDoctors());
      return;
    }
    const filtered = this.allDoctors().filter((doc) => {
      const name = (doc.name ?? `Doctor #${doc.id}`).toLowerCase();
      const bio   = doc.bio.toLowerCase();
      return name.includes(term) || bio.includes(term);
    });
    this.displayedDoctors.set(filtered);
  }

  // Resolve the speciality display name from the id stored on the doctor
  getSpecialityName(specialityRaw: string | null): string {
    if (!specialityRaw) return 'General Practice';
    // If it's already a readable string (non-numeric) return it as-is
    const asNum = Number(specialityRaw);
    if (!isNaN(asNum)) {
      const found = this.specialities.find((s) => s.id === asNum);
      return found ? found.name : 'General Practice';
    }
    return specialityRaw;
  }

  getGenderLabel(gender: number): string {
    return gender === 1 ? 'Female' : 'Male';
  }

  getGenderIcon(gender: number): string {
    return gender === 1 ? '♀' : '♂';
  }

  getExperienceBadge(years: number): string {
    if (years >= 12) return 'Senior';
    if (years >= 7)  return 'Mid-Level';
    return 'Junior';
  }

  getDoctorInitials(doctor: Doctor): string {
    if (doctor.name) {
      return doctor.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return `D${doctor.id}`;
  }
}