import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPrescription } from '../../../Core/Interfaces/Doctor/iprescription';
import { DoctorService } from '../../../Core/doctor.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../Core/auth.service';
import { PatientService } from '../../../Core/patient.service';

@Component({
  selector: 'app-prescriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prescription.component.html',
  styleUrls: ['./prescription.component.css'],
})
export class PrescriptionsComponent implements OnInit {

  prescriptions = signal<IPrescription[]>([]);
  loading       = signal(false);
  error         = signal<string | null>(null);
  expanded      = signal<Set<number>>(new Set());

  // Replace with auth service
   patientId = 3;

  // Search / filter
  searchTerm    = signal('');
  filterDoctor  = signal('');

  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const doc  = this.filterDoctor().toLowerCase().trim();
    return this.prescriptions().filter(p => {
      const matchesMed = !term || p.treatments.some(t =>
        t.medicationName.toLowerCase().includes(term) ||
        t.notes.toLowerCase().includes(term)
      );
      const matchesDoc = !doc ||
        (p.doctor?.name ?? '').toLowerCase().includes(doc) ||
        (p.doctor?.speciality ?? '').toLowerCase().includes(doc);
      return matchesMed && matchesDoc;
    });
  });

  totalMeds = computed(() =>
    this.prescriptions().reduce((sum, p) => sum + p.treatments.length, 0)
  );

  uniqueDoctors = computed(() =>
    [...new Set(this.prescriptions().map(p => p.doctor?.name).filter(Boolean))]
  );

  constructor(private doctorSvc: DoctorService , private router: Router , private authservice: AuthService  , private patientService: PatientService) {}

  ngOnInit(): void { 
    
    var userId = this.authservice.getUserId();
    if (!userId) {
      this.error.set('User not authenticated. Please log in.');
      return;
    }
      this.patientService.getPatientProfileByUserId(userId).subscribe({
      next: (data) => {
        this.patientId = data.id; // Update patientId based on profile data 
        console.log("patient id from prescription load", this.patientId);
        this.load();
      },
      error: () => {
        this.error.set('Failed to load profile. Please try again.');
      },
    });

    // this.load();
  
  }

  openDetail(id: number): void {
  this.router.navigate(['/patient/prescription', id]);
}
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.doctorSvc.getPatientPrescriptions(this.patientId).subscribe({
      next:  data => {
        console.log('Loaded prescriptions:', data);
         this.prescriptions.set(data); this.loading.set(false); },
      error: ()   => { this.error.set('Failed to load prescriptions.'); this.loading.set(false); },
    });
  }

  toggleExpand(id: number): void {
    const s = new Set(this.expanded());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expanded.set(s);
  }

  isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  getGenderIcon(gender: number): string {
    return gender === 1 ? '♀' : '♂';
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filterDoctor.set('');
  }
}