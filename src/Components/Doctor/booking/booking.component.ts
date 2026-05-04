// booking.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DoctorService } from '../../../Core/doctor.service';
import { IPrescription } from '../../../Core/Interfaces/Doctor/iprescription';
import { AuthService } from '../../../Core/auth.service';

// ══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface BookingAddress { street: string; city: string; country: string; }
export interface BookingUser {
  id: number; userName: string; email: string;
  phoneNumber: string; gender: number; createdAt: string; updatedAt: string;
}
export interface BookingPatientData {
  id: number; userId: number; dateOfBirath: string;
  address: BookingAddress; user: BookingUser; createdAt: string; updatedAt: string;
}
export interface BookingRecord {
  id: number; patientId: number; patient: BookingPatientData;
  doctorAvailabilityId: number; doctorAvailability: null;
  status: number; consultionTime: string; createdAt: string; updatedAt: string;
}
export interface Treatment {
  id: number; prescriptionId: number; medicationName: string;
  notes: string; createdAt: string; updatedAt: string;
}
export interface PrescriptionDoctor {
  id: number; name: string; speciality: string; gender: number;
  yearsOfExperience: number; bio: string; phone: string;
}
export interface Prescription {
  id: number; doctorId: number; patientId: number;
  doctor: PrescriptionDoctor; treatments: Treatment[]; diagnosis?: string;
}
export type FilterMode = 'all' | 'confirmed' | 'cancelled' | 'pending';

/** Returned by POST /api/Zoom/CreateMeeting */
export interface MeetingInfo {
  joinUrl:   string;   // patient opens this
  hostUrl:   string;   // doctor opens this
  meetingId: string;
  password:  string;
  topic:     string;
  startTime: string;
}

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
  prescriptionHistory: IPrescription[] = [];

  // ── Zoom / call state ─────────────────────────────────────────────────────
  callLoadingPatientId: number | null = null;  // which card is showing spinner
  meetingModalOpen = false;
  currentMeeting:  MeetingInfo | null = null;
  meetingPatientName = '';
  linkCopied = false;
  private meetingCache = new Map<number, MeetingInfo>(); // bookingId → meeting

  // Replace with your environment variable
  private readonly API_BASE = 'https://localhost:7000/api';

  constructor(
    private router:         Router,
    private route:          ActivatedRoute,
    private fb:             FormBuilder,
    private http:           HttpClient,
    private _doctorservice: DoctorService,
    private _authService:   AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('AvailabilityId');
    this._doctorservice.getBookingPatients(id).subscribe({
      next: (res: any) => {
        this.bookings = Array.isArray(res) ? res : [];
        this.applyFilter();
      },
      error: err => console.error(err),
    });
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  setFilter(mode: FilterMode): void { this.filterMode = mode; this.applyFilter(); }

  applyFilter(): void {
    if (this.filterMode === 'all') { this.filteredBookings = this.bookings; return; }
    const target = this.filterMode === 'confirmed' ? 2 : this.filterMode === 'cancelled' ? 1 : 0;
    this.filteredBookings = this.bookings.filter(b => b.status === target);
  }

  // ── Status helpers ────────────────────────────────────────────────────────

  statusLabel(s: number): string { return s === 2 ? 'Confirmed' : s === 1 ? 'Cancelled' : 'Pending'; }
  countByStatusNum(n: number):   number { return this.bookings.filter(b => b.status === n).length; }

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

  formatDisplayName(name: string): string { return name.replace(/([A-Z])/g, ' $1').trim(); }

  getGenderLabel(gender: number): string {
    return ({ 1: 'Male', 2: 'Female', 0: 'Other' } as Record<number,string>)[gender] ?? 'N/A';
  }

  // ── Date helpers ──────────────────────────────────────────────────────────

  formatTime(iso: string): string {
    if (!iso) return '';
    return this.parseLocal(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  formatDate(iso: string): string {
    if (!iso) return '';
    return this.parseLocal(iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

  // ══════════════════════════════════════════════════════════════════════════
  // ZOOM MEETING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Doctor clicks "Call" on a patient card.
   *
   * Step 1 — cache check: if the doctor already created a meeting for this
   *           booking in this session, just show the modal again.
   *
   * Step 2 — POST /api/Zoom/CreateMeeting  (YOUR backend, not Zoom directly)
   *           Your backend holds the Zoom Server-to-Server OAuth credentials,
   *           calls Zoom's API, and returns MeetingInfo to the Angular client.
   *
   * Step 3 — Show the meeting modal with:
   *           • "Open as host" button  → opens hostUrl in a new tab (doctor)
   *           • "Copy link" button     → copies joinUrl to clipboard (patient)
   *           • "Send to patient" btn  → POST /api/Notification/SendMeetingLink
   *
   * Backend receives:
   *   { topic, startTime, durationMinutes, patientEmail, patientName }
   *
   * Backend returns:
   *   { joinUrl, hostUrl, meetingId, password, topic, startTime }
   *
   * See ZoomController.cs for the backend implementation.
   */
  startCall(record: BookingRecord): void {

    // ── Cache hit: reuse meeting created earlier in this session ─────────
    if (this.meetingCache.has(record.id)) {
      this.activeRecord       = record;
      this.currentMeeting     = this.meetingCache.get(record.id)!;
      this.meetingPatientName = this.getDisplayName(record);
      this.meetingModalOpen   = true;
      return;
    }

    // ── Create new Zoom meeting via backend ───────────────────────────────
    this.activeRecord         = record;
    this.callLoadingPatientId = record.patientId;

    const payload = {
      topic:           `Consultation — Dr. & ${this.getDisplayName(record)}`,
      startTime:       this.slotTime || new Date().toISOString(),
      durationMinutes: 30,
      patientEmail:    this.getEmail(record),
      patientName:     this.getDisplayName(record),
    };

    // POST to YOUR ASP.NET backend — never call Zoom directly from Angular
    this.http.post<MeetingInfo>(`${this.API_BASE}/Zoom/CreateMeeting`, payload)
      .subscribe({
        next: (meeting) => {
          // Cache so clicking Call again reuses the same meeting link
          this.meetingCache.set(record.id, meeting);

          this.currentMeeting       = meeting;
          this.meetingPatientName   = this.getDisplayName(record);
          this.meetingModalOpen     = true;
          this.callLoadingPatientId = null;

          console.log('[Zoom] Meeting created successfully:', meeting);
        },
        error: (err) => {
          console.error('[Zoom] Failed to create meeting:', err);
          this.callLoadingPatientId = null;

          // Fallback: Jitsi room — always works without credentials
          const fallback = `https://meet.jit.si/MedLink-${record.id}-${record.patientId}`;
          const meeting: MeetingInfo = {
            joinUrl:   fallback,
            hostUrl:   fallback,
            meetingId: `jitsi-${record.id}`,
            password:  '',
            topic:     `Consultation with ${this.getDisplayName(record)}`,
            startTime: new Date().toISOString(),
          };
          this.meetingCache.set(record.id, meeting);
          this.currentMeeting     = meeting;
          this.meetingPatientName = this.getDisplayName(record);
          this.meetingModalOpen   = true;
        },
      });
  }

  /** Doctor joins as host — opens Zoom desktop/browser client */
  openHostMeeting(): void {
    if (this.currentMeeting?.hostUrl) {
      window.open(this.currentMeeting.hostUrl, '_blank');
    }
  }

  /** Copy patient's join link to clipboard so doctor can paste it in chat/SMS */
  copyJoinLink(): void {
    if (!this.currentMeeting?.joinUrl) return;
    navigator.clipboard.writeText(this.currentMeeting.joinUrl).then(() => {
      this.linkCopied = true;
      setTimeout(() => (this.linkCopied = false), 2500);
    });
  }

  /**
   * Optional: asks your backend to email the join link to the patient.
   * Backend endpoint: POST /api/Notification/SendMeetingLink
   * Body: { patientEmail, joinUrl, topic }
   */
  sendLinkToPatient(): void {
    if (!this.currentMeeting || !this.activeRecord) return;

    this.http.post(`${this.API_BASE}/Notification/SendMeetingLink`, {
      patientEmail: this.getEmail(this.activeRecord),
      joinUrl:      this.currentMeeting.joinUrl,
      topic:        this.currentMeeting.topic,
    }).subscribe({
      next: () => alert(`Link sent to ${this.getEmail(this.activeRecord!)}`),
      error: err => console.error('[Notification] Failed to send link:', err),
    });
  }

  closeMeetingModal(): void {
    this.meetingModalOpen = false;
    this.currentMeeting   = null;
    this.linkCopied       = false;
  }

  // ── Prescription drawer ───────────────────────────────────────────────────

  openRxDrawer(record: BookingRecord): void {
    this.activeRecord = record;
    this.rxError      = '';
    this.rxForm = this.fb.group({
      diagnosis:  ['', Validators.required],
      treatments: this.fb.array([this.newTreatmentGroup()]),
    });
    this.rxDrawerOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeRxDrawer(): void { this.rxDrawerOpen = false; document.body.style.overflow = ''; }

  get treatmentsArray(): FormArray { return this.rxForm?.get('treatments') as FormArray; }

  private newTreatmentGroup(): FormGroup {
    return this.fb.group({ medicationName: ['', Validators.required], notes: [''] });
  }

  addTreatment(): void             { this.treatmentsArray.push(this.newTreatmentGroup()); }
  removeTreatment(i: number): void { this.treatmentsArray.removeAt(i); }

  submitRx(): void {
    if (!this.rxForm || this.rxForm.invalid) {
      this.rxError = 'Please fill in the diagnosis and all medication names.';
      return;
    }
    const payload = {
      doctorId:   Number(this._authService.Id),
      patientId:  this.activeRecord!.patientId,
      diagnosis:  this.rxForm.value.diagnosis,
      treatments: this.rxForm.value.treatments,
    };
    this.rxSaving = true;
    this._doctorservice.createPrescription(payload).subscribe({
      next: (res) => { this.rxSaving = false; this.closeRxDrawer(); console.log('[Rx]', res); },
      error: (err) => {
        this.rxError  = err?.error?.message ?? 'Failed to save prescription.';
        this.rxSaving = false;
      },
    });
  }

  // ── History drawer ────────────────────────────────────────────────────────

  openHistoryDrawer(record: BookingRecord): void {
    this.activeRecord        = record;
    this.historyDrawerOpen   = true;
    this.historyLoading      = true;
    this.prescriptionHistory = [];
    document.body.style.overflow = 'hidden';
    this._doctorservice.getPatientPrescriptions(record.patientId).subscribe({
      next: (res: IPrescription[]) => { this.prescriptionHistory = res; this.historyLoading = false; },
      error: (err) => { this.historyLoading = false; console.error(err); },
    });
  }

  closeHistoryDrawer(): void { this.historyDrawerOpen = false; document.body.style.overflow = ''; }

  openRxFromHistory(): void {
    this.closeHistoryDrawer();
    if (this.activeRecord) setTimeout(() => this.openRxDrawer(this.activeRecord!), 350);
  }
}