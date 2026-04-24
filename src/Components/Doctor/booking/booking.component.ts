// booking.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorService } from '../../../Core/doctor.service';

// ══════════════════════════════════════════════════════════════════════════════
// INTERFACES — matching the real API response exactly
// ══════════════════════════════════════════════════════════════════════════════

export interface BookingAddress {
  street:  string;
  city:    string;
  country: string;
}

export interface BookingUser {
  id:                  number;
  userName:            string;
  email:               string;
  phoneNumber:         string;
  gender:              number;   // 1 = Male, 2 = Female, 0 = Other
  createdAt:           string;
  updatedAt:           string;
}

export interface BookingPatientData {
  id:           number;
  userId:       number;
  dateOfBirath: string;   // API typo preserved
  address:      BookingAddress;
  user:         BookingUser;
  createdAt:    string;
  updatedAt:    string;
}

/** One record in the getBookingPatients array */
export interface BookingRecord {
  id:                   number;
  patientId:            number;
  patient:              BookingPatientData;
  doctorAvailabilityId: number;
  doctorAvailability:   null;
  status:               number;   // 0 = Pending, 1 = Confirmed, 2 = Cancelled
  consultionTime:       string;   // API typo "consultion" preserved
  createdAt:            string;
  updatedAt:            string;
}

// ── Prescription interfaces ────────────────────────────────────────────────

export interface Treatment {
  id:             number;
  prescriptionId: number;
  medicationName: string;
  notes:          string;
  createdAt:      string;
  updatedAt:      string;
}

export interface PrescriptionDoctor {
  id:                number;
  name:              string;
  speciality:        string;
  gender:            number;
  yearsOfExperience: number;
  bio:               string;
  phone:             string;
}

export interface Prescription {
  id:         number;
  doctorId:   number;
  patientId:  number;
  doctor:     PrescriptionDoctor;
  treatments: Treatment[];
}

export type FilterMode = 'all' | 'confirmed' | 'cancelled' | 'pending';

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

@Component({
  selector:    'app-booking',
  standalone:  true,
  imports:     [CommonModule, ReactiveFormsModule],
  templateUrl: './booking.component.html',
  styleUrls:   ['./booking.component.css'],
})
export class BookingComponent implements OnInit {

  // ── Booking data ──────────────────────────────────────────────────────────
  bookings:         BookingRecord[] = [];
  filteredBookings: BookingRecord[] = [];
  filterMode:       FilterMode      = 'all';

  // All records share the same slot — derive from first item
  get slotTime():       string { return this.bookings[0]?.consultionTime ?? ''; }
  get availabilityId(): number { return this.bookings[0]?.doctorAvailabilityId ?? 0; }

  // ── Prescription drawer ───────────────────────────────────────────────────
  rxDrawerOpen  = false;
  rxSaving      = false;
  rxError       = '';
  rxForm!:      FormGroup;
  activeRecord: BookingRecord | null = null;

  // ── History drawer ────────────────────────────────────────────────────────
  historyDrawerOpen    = false;
  historyLoading       = false;
  prescriptionHistory: Prescription[] = [];

  constructor(
    private router:         Router,
    private route:          ActivatedRoute,
    private fb:             FormBuilder,
    private _doctorservice: DoctorService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('AvailabilityId');
    this._doctorservice.getBookingPatients(id).subscribe({
      next: (res: any) => {
        console.log(res);
        this.bookings = Array.isArray(res) ? res : [];
        this.applyFilter();
      },
      error: err => console.error(err),
    });
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  setFilter(mode: FilterMode): void {
    this.filterMode = mode;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.filterMode === 'all') {
      this.filteredBookings = this.bookings;
      return;
    }
    const target = this.filterMode === 'confirmed' ? 2
                 : this.filterMode === 'cancelled'  ? 1
                 : 0;
    this.filteredBookings = this.bookings.filter(b => b.status === target);
  }

  // ── Status helpers ────────────────────────────────────────────────────────

  statusLabel(status: number): string {
    return status === 2 ? 'Confirmed'
         : status === 1 ? 'Cancelled'
         : 'Pending';
  }

  countByStatusNum(num: number): number {
    return this.bookings.filter(b => b.status === num).length;
  }

  // ── Patient helpers ───────────────────────────────────────────────────────

  getDisplayName(r: BookingRecord): string { return this.formatDisplayName(r.patient.user.userName); }
  getEmail(r:  BookingRecord): string      { return r.patient.user.email; }
  getPhone(r:  BookingRecord): string      { return r.patient.user.phoneNumber; }
  getGender(r: BookingRecord): number      { return r.patient.user.gender; }

  getInitials(name: string): string {
    const clean = name.replace(/\d+/g, '').trim();
    const parts = clean.split(/(?=[A-Z])/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }

  formatDisplayName(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').trim();
  }

  getGenderLabel(gender: number): string {
    const map: Record<number, string> = { 1: 'Male', 2: 'Female', 0: 'Other' };
    return map[gender] ?? 'N/A';
  }

  // ── Date helpers ──────────────────────────────────────────────────────────

  formatTime(iso: string): string {
    if (!iso) return '';
    return this.parseLocal(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return this.parseLocal(iso).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  formatDOB(iso: string): string {
    if (!iso) return '—';
    return this.parseLocal(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private parseLocal(iso: string): Date {
    if (!iso) return new Date(NaN);
    if (iso.endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(iso)) return new Date(iso);
    const [dp, tp = '00:00:00'] = iso.split('T');
    const [yr, mo, dy] = dp.split('-').map(Number);
    const [hr, mn, sc = 0] = tp.split(':').map(Number);
    return new Date(yr, mo - 1, dy, hr, mn, sc);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goBack(): void { this.router.navigate(['..'], { relativeTo: this.route }); }
  openPhone(phone: string): void { window.open(`tel:${phone}`, '_blank'); }

  // ── Create Prescription Drawer ────────────────────────────────────────────

  openRxDrawer(record: BookingRecord): void {
    this.activeRecord = record;
    this.rxError      = '';
    this.rxForm = this.fb.group({
      treatments: this.fb.array([this.newTreatmentGroup()]),
    });
    this.rxDrawerOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeRxDrawer(): void {
    this.rxDrawerOpen = false;
    document.body.style.overflow = '';
  }

  get treatmentsArray(): FormArray {
    return this.rxForm?.get('treatments') as FormArray;
  }

  private newTreatmentGroup(): FormGroup {
    return this.fb.group({
      medicationName: ['', Validators.required],
      notes:          [''],
    });
  }

  addTreatment(): void         { this.treatmentsArray.push(this.newTreatmentGroup()); }
  removeTreatment(i: number): void { this.treatmentsArray.removeAt(i); }

  submitRx(): void {
    if (!this.rxForm || this.rxForm.invalid) {
      this.rxError = 'Please fill in all medication names.';
      return;
    }
    const payload = {
      doctorId:   2, // replace: AuthService.getDoctorId()
      patientId:  this.activeRecord!.patientId,
      treatments: this.rxForm.value.treatments,
    };
    console.log('[Prescription payload]', payload);
    // this.rxSaving = true;
    // this._doctorservice.createPrescription(payload).subscribe({
    //   next: () => { this.rxSaving = false; this.closeRxDrawer(); },
    //   error: err => { this.rxError = err?.error?.message ?? 'Failed'; this.rxSaving = false; }
    // });
    this.closeRxDrawer();
  }

  // ── History Drawer ────────────────────────────────────────────────────────

  openHistoryDrawer(record: BookingRecord): void {
    this.activeRecord        = record;
    this.historyDrawerOpen   = true;
    this.historyLoading      = true;
    this.prescriptionHistory = [];
    document.body.style.overflow = 'hidden';

    // this._doctorservice.getPatientPrescriptions(record.patientId).subscribe({
    //   next: (res: Prescription[]) => { this.prescriptionHistory = res; this.historyLoading = false; },
    //   error: () => { this.historyLoading = false; }
    // });

    setTimeout(() => {
      this.prescriptionHistory = [
        {
          id: 6, doctorId: 8, patientId: record.patientId,
          doctor: { id: 8, name: 'mostafa_k', speciality: 'Gynecology', gender: 1, yearsOfExperience: 11, bio: '', phone: '+201234567890' },
          treatments: [
            { id: 1, prescriptionId: 6, medicationName: 'Paracetamol', notes: 'Take twice daily after meals', createdAt: '', updatedAt: '' },
            { id: 2, prescriptionId: 6, medicationName: 'Ibuprofen',   notes: 'Take once daily after food',  createdAt: '', updatedAt: '' },
          ],
        },
        {
          id: 7, doctorId: 6, patientId: record.patientId,
          doctor: { id: 6, name: 'sara_m', speciality: 'Pediatrics', gender: 1, yearsOfExperience: 6, bio: '', phone: '+201112345678' },
          treatments: [
            { id: 3, prescriptionId: 7, medicationName: 'Amoxicillin', notes: 'Take three times daily',     createdAt: '', updatedAt: '' },
            { id: 4, prescriptionId: 7, medicationName: 'Vitamin C',   notes: 'Take once daily with water', createdAt: '', updatedAt: '' },
          ],
        },
      ];
      this.historyLoading = false;
    }, 600);
  }

  closeHistoryDrawer(): void {
    this.historyDrawerOpen = false;
    document.body.style.overflow = '';
  }

  openRxFromHistory(): void {
    this.closeHistoryDrawer();
    if (this.activeRecord) {
      setTimeout(() => this.openRxDrawer(this.activeRecord!), 350);
    }
  }
}