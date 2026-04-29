import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';                        // ✅ add this
import { RouterModule } from '@angular/router';                  // ✅ add this
import { PatientService } from '../../../Core/patient.service';

export interface Speciality {
  id: number;
  name: string;
}

@Component({
  selector: 'app-find-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],             // ✅ add RouterModule
  templateUrl: './find-doctor.component.html',
  styleUrls: ['./find-doctor.component.css'],
})
export class FindDoctorComponent implements OnInit {

  allDoctors = signal<any[]>([]);
  displayedDoctors = signal<any[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  searchName = '';
  selectedSpecialityId: number | '' = '';

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

  constructor(
    private patientservice: PatientService,
    private router: Router,                                       // ✅ inject Router
  ) {}

  ngOnInit(): void {
    this.loadAllDoctors();
  }

  loadAllDoctors(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.patientservice.getAllDoctors().subscribe({
      next: (doctors) => {
        this.allDoctors.set(doctors);
        console.log("all doctors" , this.allDoctors());
        
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
      this.patientservice.getAllDoctorsBySpeciality(this.selectedSpecialityId as number).subscribe({
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
      const bio  = (doc.bio ?? '').toLowerCase();
      return name.includes(term) || bio.includes(term);
    });
    this.displayedDoctors.set(filtered);
  }

  // ✅ Navigate to availability page
  viewAvailability(doctorId: number): void {
    console.log(doctorId,"doctor Id");
    
    this.router.navigate(['/patient/doctor', doctorId, 'availability']);
  }

  getSpecialityName(specialityRaw: string | null): string {
    if (!specialityRaw) return 'General Practice';
    const asNum = Number(specialityRaw);
    if (!isNaN(asNum)) {
      const found = this.specialities.find(s => s.id === asNum);
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

  getDoctorInitials(doc: any): string {
    if (doc.name) {
      return doc.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return `D${doc.id}`;
  }
}