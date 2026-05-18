import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../../Core/patient.service';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../Core/auth.service';
import { DoctorService } from '../../../Core/doctor.service';
export interface PatientProfile {
  id: number;
  name: string;
  gender: number;
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
   patientId = 2;

  editForm: EditableFields = { name: '', email: '', phone: '' };

  constructor(private patientService: PatientService, private doctorservie : DoctorService, private authservice : AuthService) {}

  totalprecriptions = signal(3);
  totalappointments = signal(4);

 


  ngOnInit(): void {
       

    this.loadProfile();
    
  }

 loadProfile(): void {
  this.isLoading.set(true);
  this.error.set(null);

  const userId = this.authservice.getUserId();

  if (!userId) {
    this.error.set('User not authenticated. Please log in.');
    this.isLoading.set(false);
    return;
  }

  this.patientService.getPatientProfileByUserId(userId).subscribe({
    next: (data) => {

      this.patientId = data.id;

      console.log("patient id from profile load", this.patientId);

      this.profile.set(data);

      // LOAD APPOINTMENTS AFTER patientId IS READY
      this.patientService.getAppointments(this.patientId).subscribe({
        next: (appointments) => {
          console.log(appointments, "appointments");
          this.totalappointments.set(appointments.length);
        },
        error: () => {
          this.error.set('Failed to load appointments.');
        }
      });

      // LOAD PRESCRIPTIONS AFTER patientId IS READY
      this.doctorservie.getPatientPrescriptions(this.patientId).subscribe({
        next: (list) => {
          console.log(list, "prescriptions");
          this.totalprecriptions.set(list.length);
        },
        error: () => {
          console.log('Failed to load prescriptions.');
        }
      });

      this.isLoading.set(false);
    },

    error: () => {
      this.error.set('Failed to load profile. Please try again.');
      this.isLoading.set(false);
    },
  });
}

  getGenderLabel(gender: number): string {
    return gender === 0 ? 'Male' : 'Female';
  }

  getGenderIcon(gender: number): string {
    return gender === 0 ? '♂' : '♀';
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
    this.patientService.updateProfile(this.patientId, { ...p, ...this.editForm }).subscribe({
      next: (res) => {

        
        this.profile.set({ ...p, ...this.editForm }); // Update local state on success  
    this.profile.set({ ...p, ...this.editForm });
    this.isEditing.set(false);
  }
      ,
      error: (err) => {
        console.error('Error updating profile:', err);
      } 
    });
  }
}