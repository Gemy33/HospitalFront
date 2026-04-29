import {
  Component, OnInit
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DoctorService } from '../../../Core/doctor.service';
import { ICreateAvailability } from '../../../Core/Interfaces/Doctor/icreate-availability';
import { AuthService } from '../../../Core/auth.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DoctorAvailabilityData {
  doctorId:               number;
  doctor:                 null;
  availableFrom:          string;
  maxPatients:            number;
  sessionDurationMinutes: number;
  price:                  number;
  id:                     number;
  createdAt:              string;
  updatedAt:              string;
}

export interface AvailabilitySlot {
  doctorAvailability: DoctorAvailabilityData;
  book_Complete:      boolean;
}

export interface CreateSlotPayload {
  doctorId:               number;
  availableFrom:          string;
  maxPatients:            number;
  sessionDurationMinutes: number;
  price:                  number;
}

export interface UpdateSlotPayload extends CreateSlotPayload {
  id: number;
}

export interface SummaryCard {
  label:     string;
  value:     string;
  iconPath:  string;
  iconBg:    string;
  iconColor: string;
}

export type ModalMode  = 'create' | 'edit' | 'view';
export type FilterMode = 'all' | 'today' | 'week' | 'future';
export type ToastType  = 'success' | 'error';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-availabilty',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,RouterLink, FormsModule, RouterModule, HttpClientModule, DecimalPipe],
  templateUrl: './availabilty.component.html',
  styleUrls:   ['./availabilty.component.css'],
})
export class AvailabiltyComponent implements OnInit {

  private readonly DOCTOR_ID = Number(this._authservice.Id);
  private readonly BASE_URL  = '/api/availability';

  isLoading         = true;
  isSaving          = false;
  modalOpen         = false;
  deleteConfirmOpen = false;
  apiError          = '';

  modalMode:  ModalMode  = 'create';
  filterMode: FilterMode = 'all';
  searchQuery = '';

  allSlots:      AvailabilitySlot[] = [];
  filteredSlots: AvailabilitySlot[] = [];

  activeSlot:    AvailabilitySlot | null = null;
  slotToDelete:  AvailabilitySlot | null = null;
  selectedSlotId = 0;

  summaryCards: SummaryCard[] = [];

  readonly durationPresets = [15, 20, 30, 45, 60];
  readonly pricePresets    = [50, 100, 150, 200, 300];

  form = this.emptyForm();

  toastVisible = false;
  toastMessage = '';
  toastType: ToastType = 'success';
  private toastTimer?: ReturnType<typeof setTimeout>;

  createslotForm: FormGroup = new FormGroup({
    availableFrom:          new FormControl('', Validators.required),
    maxPatients:            new FormControl(1,  [Validators.required, Validators.min(1),  Validators.max(100)]),
    sessionDurationMinutes: new FormControl(30, [Validators.required, Validators.min(5),  Validators.max(240)]),
    price:                  new FormControl(0,  [Validators.required, Validators.min(0)]),
  });

  constructor(private http: HttpClient, private _doctorservice: DoctorService,private _authservice:AuthService) {}

  ngOnInit(): void {
    this.loadSlots();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  data(slot: AvailabilitySlot):     DoctorAvailabilityData { return slot.doctorAvailability; }
  slotId(slot: AvailabilitySlot):   number                 { return slot.doctorAvailability.id; }
  slotFrom(slot: AvailabilitySlot): string                 { return slot.doctorAvailability.availableFrom; }

  // ── Load ──────────────────────────────────────────────────────────────────────

  loadSlots(): void {
    this.isLoading = true;
    this._doctorservice.getDoctorAvailabilities(this.DOCTOR_ID).subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : res?.data ?? [];
        this.allSlots = this.sortSlots(this.normalise(raw));
        console.log(res);
        this.applyFilter();
        this.buildSummary();
        this.isLoading = false;
      },
      error: () => {
        this.allSlots = this.mockSlots();
        this.applyFilter();
        this.buildSummary();
        this.isLoading = false;
      },
    });
  }

  private normalise(raw: any[]): AvailabilitySlot[] {
    return raw.map(item =>
      item.doctorAvailability
        ? (item as AvailabilitySlot)
        : { doctorAvailability: item as DoctorAvailabilityData, book_Complete: item.book_Complete ?? false }
    );
  }

  // ── Create ────────────────────────────────────────────────────────────────────

  private createSlot(payload: ICreateAvailability): void {
    this.isSaving = true;
    this.apiError = '';
    this._doctorservice.createAvailability(payload).subscribe({
      next: () => {
        // ✅ FIX: loadSlots() is called ONLY here — after the API confirms success.
        // Previously it was called in submitForm() right after createSlot(),
        // which caused a race: loadSlots() ran before the DB was updated,
        // returned stale/empty data, and Angular rendered NaN cards.
        this.isSaving = false;
        this.closeModal();
        this.showToast('Availability slot created successfully!', 'success');
        this.loadSlots();
      },
      error: (err) => {
        this.apiError = err?.error?.message ?? 'Failed to create slot. Please try again.';
        this.isSaving = false;
      },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  private updateSlot(payload: UpdateSlotPayload): void {
    this.isSaving = true;
    this.apiError = '';
    this._doctorservice.updateAvailability(payload).subscribe({
      next: () => {
        // ✅ Same pattern — reload only after confirmed server response
        this.isSaving = false;
        this.closeModal();
        this.showToast('Slot updated successfully!', 'success');
        this.loadSlots();
      },
      error: (err) => {
        this.apiError = err?.error?.message ?? 'Failed to update slot. Please try again.';
        this.isSaving = false;
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  private deleteSlot(id: number): void {
    this.isSaving = true;
    this._doctorservice.deleteAvailability(id).subscribe({
      next: () => {
        this.allSlots = this.allSlots.filter(s => this.slotId(s) !== id);
        this.applyFilter();
        this.buildSummary();
        this.isSaving          = false;
        this.deleteConfirmOpen = false;
        this.slotToDelete      = null;
        this.showToast('Slot deleted.', 'success');
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast(err?.error?.message ?? 'Failed to delete slot.', 'error');
        this.deleteConfirmOpen = false;
      },
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────────

  openModal(mode: ModalMode, slot?: AvailabilitySlot): void {
    this.modalMode  = mode;
    this.apiError   = '';
    this.activeSlot = slot ?? null;

    if (mode === 'create') {
      this.createslotForm.reset({
        availableFrom: '', maxPatients: 20, sessionDurationMinutes: 30, price: 150,
      });
    } else if ((mode === 'edit' || mode === 'view') && slot) {
      this.createslotForm.patchValue({
        availableFrom:          this.toDateTimeLocal(slot.doctorAvailability.availableFrom),
        maxPatients:            slot.doctorAvailability.maxPatients,
        sessionDurationMinutes: slot.doctorAvailability.sessionDurationMinutes,
        price:                  slot.doctorAvailability.price,
      });
    }

    this.modalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.modalOpen = false;
    this.apiError  = '';
    document.body.style.overflow = '';
    setTimeout(() => { this.activeSlot = null; this.form = this.emptyForm(); }, 350);
  }

  submitForm(): void {
    if (this.createslotForm.invalid) return;

    if (this.modalMode === 'create') {
      const payload: CreateSlotPayload = {
        doctorId:               this.DOCTOR_ID,
        availableFrom:          this.createslotForm.value.availableFrom,
        maxPatients:            +this.createslotForm.value.maxPatients,
        sessionDurationMinutes: +this.createslotForm.value.sessionDurationMinutes,
        price:                  +this.createslotForm.value.price,
      };
      this.createSlot(payload);
      // ❌ loadSlots() removed from here — was the root cause of NaN cards

    } else if (this.modalMode === 'edit' && this.activeSlot) {
      const payload: UpdateSlotPayload = {
        id:                     this.slotId(this.activeSlot),
        doctorId:               this.DOCTOR_ID,
        availableFrom:          this.createslotForm.value.availableFrom,
        maxPatients:            +this.createslotForm.value.maxPatients,
        sessionDurationMinutes: +this.createslotForm.value.sessionDurationMinutes,
        price:                  +this.createslotForm.value.price,
      };
      this.updateSlot(payload);
      // ❌ loadSlots() removed from here too
    }
  }

  // ── Selection / Delete flow ───────────────────────────────────────────────────

  selectSlot(slot: AvailabilitySlot): void {
    const id = this.slotId(slot);
    this.selectedSlotId = this.selectedSlotId === id ? 0 : id;
  }

  viewSlot(slot: AvailabilitySlot): void { this.openModal('view', slot); }

  confirmDelete(slot: AvailabilitySlot): void {
    this.slotToDelete = slot; this.deleteConfirmOpen = true;
  }

  cancelDelete(): void { this.deleteConfirmOpen = false; this.slotToDelete = null; }
  executeDelete(): void { if (this.slotToDelete) this.deleteSlot(this.slotId(this.slotToDelete)); }

  // ── Filter ────────────────────────────────────────────────────────────────────

  setFilter(mode: FilterMode): void { this.filterMode = mode; this.applyFilter(); }

  applyFilter(): void {
    const q   = this.searchQuery.toLowerCase().trim();
    const now = new Date();

    let result = this.allSlots.filter(slot => {
      const date = this.parseSlotDate(this.slotFrom(slot));
      switch (this.filterMode) {
        case 'today':  return date.toDateString() === now.toDateString();
        case 'week': {
          const start = new Date(now);
          start.setDate(now.getDate() - now.getDay());
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 7);
          return date >= start && date <= end;
        }
        case 'future': return date > now;
        default:       return true;
      }
    });

    if (q) {
      result = result.filter(slot =>
        this.formatFullDate(this.slotFrom(slot)).toLowerCase().includes(q) ||
        String(slot.doctorAvailability.price).includes(q)                  ||
        String(slot.doctorAvailability.maxPatients).includes(q)            ||
        String(slot.doctorAvailability.id).includes(q)                     ||
        this.getDayName(this.slotFrom(slot)).toLowerCase().includes(q)
      );
    }

    this.filteredSlots = result;
  }

  // ── Summary ───────────────────────────────────────────────────────────────────

  private buildSummary(): void {
    const now      = new Date();
    const future   = this.allSlots.filter(s => this.parseSlotDate(this.slotFrom(s)) > now);
    const today    = this.allSlots.filter(s => this.parseSlotDate(this.slotFrom(s)).toDateString() === now.toDateString());
    const avgPrice = this.allSlots.length
      ? this.allSlots.reduce((sum, s) => sum + s.doctorAvailability.price, 0) / this.allSlots.length
      : 0;

    this.summaryCards = [
      { label: 'Total Slots', value: String(this.allSlots.length),
        iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        iconBg: 'rgba(0,212,200,0.10)', iconColor: '#00d4c8' },
      { label: 'Upcoming', value: String(future.length),
        iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        iconBg: 'rgba(129,140,248,0.12)', iconColor: '#818cf8' },
      { label: 'Today', value: String(today.length),
        iconPath: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
        iconBg: 'rgba(240,180,41,0.12)', iconColor: '#f0b429' },
      { label: 'Avg. Price', value: avgPrice > 0 ? `${Math.round(avgPrice)} EGP` : '—',
        iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        iconBg: 'rgba(244,63,94,0.10)', iconColor: '#f43f5e' },
    ];
  }

  // ── Date helpers ──────────────────────────────────────────────────────────────

  /**
   * SINGLE safe parser used by every date comparison and display in this file.
   *
   * Root cause of all filter/summary bugs:
   * The backend returns "2026-03-25T10:30:00" with NO timezone suffix.
   * Safari and some environments parse this as UTC → dates shift by UTC offset
   * (Egypt = UTC+3), so a 10:30 local slot becomes 07:30 UTC, appearing 3 hrs
   * earlier and pushing future slots into "past", wrecking today/upcoming counts.
   *
   * Fix: when there is no Z or ±offset, split the string manually and construct
   * a Date with local-time constructor arguments — guaranteed correct on all browsers.
   */
  private parseSlotDate(iso: string): Date {
    if (!iso) return new Date(NaN);
    if (iso.endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(iso)) return new Date(iso);
    const [datePart, timePart = '00:00:00'] = iso.split('T');
    const [yr, mo, dy]          = datePart.split('-').map(Number);
    const [hr, mn, sc = 0]      = timePart.split(':').map(Number);
    return new Date(yr, mo - 1, dy, hr, mn, sc);
  }

  getMonth(iso: string)   { return this.parseSlotDate(iso).toLocaleDateString('en-US', { month: 'short' }).toUpperCase(); }
  getDay(iso: string)     { return String(this.parseSlotDate(iso).getDate()).padStart(2, '0'); }
  getYear(iso: string)    { return String(this.parseSlotDate(iso).getFullYear()); }
  getDayName(iso: string) { return this.parseSlotDate(iso).toLocaleDateString('en-US', { weekday: 'long' }); }
  isPast(iso: string)     { return this.parseSlotDate(iso) < new Date(); }

  formatTime(iso: string): string {
    return this.parseSlotDate(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatFullDate(iso: string): string {
    return this.parseSlotDate(iso).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  formatPreviewDate(local: string): string {
    if (!local) return '';
    try { return this.formatFullDate(local) + ' at ' + this.formatTime(local); }
    catch { return local; }
  }

  private toDateTimeLocal(iso: string): string {
    const d = this.parseSlotDate(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  trackById(_: number, slot: AvailabilitySlot): number { return slot.doctorAvailability.id; }

  private sortSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
    return [...slots].sort((a, b) =>
      this.parseSlotDate(this.slotFrom(a)).getTime() - this.parseSlotDate(this.slotFrom(b)).getTime()
    );
  }

  private emptyForm() {
    return { availableFrom: '', maxPatients: 20, sessionDurationMinutes: 30, price: 150 };
  }

  showToast(message: string, type: ToastType = 'success'): void {
    clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType    = type;
    this.toastVisible = true;
    this.toastTimer   = setTimeout(() => { this.toastVisible = false; }, 3500);
  }

  private mockSlots(): AvailabilitySlot[] {
    const base = new Date();
    const mk = (off: number, h: number, id: number): AvailabilitySlot => {
      const d = new Date(base);
      d.setDate(d.getDate() + off); d.setHours(h, 30, 0, 0);
      const iso = d.toISOString().replace('Z', '');
      return {
        doctorAvailability: {
          id, doctorId: this.DOCTOR_ID, doctor: null, availableFrom: iso,
          maxPatients: [10,15,20,25][id%4], sessionDurationMinutes: [15,20,30,45][id%4],
          price: [100,120,150,200][id%4], createdAt: iso, updatedAt: iso,
        },
        book_Complete: false,
      };
    };
    return [mk(-1,9,1),mk(0,10,2),mk(0,14,3),mk(1,9,4),mk(1,11,5),mk(2,10,6),mk(3,13,7),mk(5,9,8)];
  }
}