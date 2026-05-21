// prescription.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorService } from '../../../Core/doctor.service';
import { AuthService } from '../../../Core/auth.service';
import { PatientService } from '../../../Core/patient.service';

// ── Interfaces — matching real API response exactly ───────────────────────────

export interface PrescriptionDoctor {
  id:                number;
  name:              string;
  speciality:        string;
  gender:            number;   // 1=Male, 2=Female, 0=Other
  yearsOfExperience: number;
  bio:               string;
  phone:             string;
  isApproed:         boolean;  // API typo preserved
}

export interface PrescriptionTreatment {
  id:             number;
  prescriptionId: number;
  medicationName: string;
  notes:          string;
  createdAt:      string;
  updatedAt:      string;
}

export interface Prescription {
  id:            number;
  doctorId:      number;
  patientId:     number;
  doctor:        PrescriptionDoctor | null;
  treatments:    PrescriptionTreatment[];
  diagnosis:     string;        // ✅ top-level field in real response
  aiExplanation: string;        // ✅ top-level field in real response
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector:    'app-prescriptions',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './prescription.component.html',
  styleUrls:   ['./prescription.component.css'],
})
export class PrescriptionsComponent implements OnInit {

  prescriptions = signal<Prescription[]>([]);
  loading       = signal(false);
  error         = signal<string | null>(null);
  expanded      = signal<Set<number>>(new Set());

  patientId = 0;

  // ── Search / filter ──────────────────────────────────────────────────────

  searchTerm   = signal('');
  filterDoctor = signal('');

  /** Filter by medication name, notes, diagnosis or AI explanation */
  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const doc  = this.filterDoctor().toLowerCase().trim();
    return this.prescriptions().filter(p => {
      const matchesMed = !term ||
        p.treatments.some(t =>
          t.medicationName.toLowerCase().includes(term) ||
          t.notes.toLowerCase().includes(term)
        ) ||
        (p.diagnosis     ?? '').toLowerCase().includes(term) ||
        (p.aiExplanation ?? '').toLowerCase().includes(term);

      const matchesDoc = !doc ||
        (p.doctor?.name      ?? '').toLowerCase().includes(doc) ||
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

  constructor(
    private doctorSvc:      DoctorService,
    private router:         Router,
    private authService:    AuthService,
    private patientService: PatientService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.error.set('User not authenticated. Please log in.');
      return;
    }

    this.patientService.getPatientProfileByUserId(userId).subscribe({
      next: (data) => {
        this.patientId = data.id;
        this.load();
      },
      error: () => {
        this.error.set('Failed to load profile. Please try again.');
      },
    });
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    // GET /api/Prescription/patient/{patientId}
    // Response is Prescription[] — diagnosis & aiExplanation are top-level
    this.doctorSvc.getPatientPrescriptions(this.patientId).subscribe({
      next: (data: any[]) => {
        // Map to ensure all fields are present even if API omits optional ones
        const mapped: Prescription[] = data.map(p => ({
          id:            p.id,
          doctorId:      p.doctorId,
          patientId:     p.patientId,
          doctor:        p.doctor ?? null,
          treatments:    p.treatments ?? [],
          diagnosis:     p.diagnosis     ?? '',
          aiExplanation: p.aiExplanation ?? '',
        }));
        this.prescriptions.set(mapped);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load prescriptions.');
        this.loading.set(false);
      },
    });
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  toggleExpand(id: number): void {
    const s = new Set(this.expanded());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expanded.set(s);
  }

  isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  openDetail(id: number): void {
    this.router.navigate(['/patient/prescription', id]);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filterDoctor.set('');
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    // Handle camelCase usernames: "omar.test" → "OT", "IslamAhmed" → "IA"
    const clean = name.replace(/[._-]/g, ' ');
    return clean.trim().split(/[\s]+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  formatDisplayName(name: string | null | undefined): string {
    if (!name) return 'Unknown Doctor';
    // "omar.test" → "Omar Test"  |  "IslamAhmed" → "Islam Ahmed"
    return name
      .replace(/[._-]/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  genderLabel(gender: number): string {
    return gender === 2 ? '♀ Female' : gender === 1 ? '♂ Male' : 'Other';
  }

  formatDate(iso: string): string {
    if (!iso || iso.startsWith('0001')) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return '—'; }
  }

  hasAiExplanation(rx: Prescription): boolean {
    return !!rx.aiExplanation && rx.aiExplanation.trim().length > 0;
  }

  hasDiagnosis(rx: Prescription): boolean {
    return !!rx.diagnosis && rx.diagnosis.trim().length > 0;
  }
}