import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../../Core/patient.service';
export interface PatientProfile {
  id: number;
  name: string;
  gender: string;
  email: string;
  phone: string;
}

type EditableFields = Pick<PatientProfile, 'name' | 'email' | 'phone'>;
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})





export class ProfileComponent implements OnInit {
  profile = signal<PatientProfile | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  isEditing = signal(false);

  // Hardcode or pull from auth service — the patient's own id
  private readonly patientId = 2;

  editForm: EditableFields = { name: '', email: '', phone: '' };

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.patientService.getProfile(this.patientId).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load profile. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  getGenderLabel(gender: number): string {
    return gender === 1 ? 'Female' : 'Male';
  }

  getGenderIcon(gender: number): string {
    return gender === 1 ? '♀' : '♂';
  }

  getInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  /** Split a camelCase name like "AhmedfHassan" into "Ahmedf Hassan" for display */
  formatName(name: string): string {
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  enterEdit(): void {
    const p = this.profile();
    if (!p) return;
    this.editForm = { name: p.name, email: p.email, phone: p.phone };
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  saveEdit(): void {
    const p = this.profile();
    if (!p) return;
    // Merge edits into the current profile signal (optimistic update)
    // Replace this with a real save API call when available
    this.profile.set({ ...p, ...this.editForm });
    this.isEditing.set(false);
  }
}