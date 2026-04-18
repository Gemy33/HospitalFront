import {
  Component, OnInit
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DoctorService } from '../../../Core/doctor.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  DoctorAvailabilityId: number;
  doctorId:             number;
  availableFrom:        string;   // ISO 8601 — "2026-03-25T10:30:00"
  maxPatients:          number;
  sessionDurationMinutes: number;
  price:                number;
}

export interface CreateSlotPayload {
  doctorId:               number;
  availableFrom:          string;
  maxPatients:            number;
  sessionDurationMinutes: number;
  price:                  number;
}

export interface UpdateSlotPayload extends CreateSlotPayload {
  DoctorAvailabilityId: number;
}

export interface SummaryCard {
  label:     string;
  value:     string;
  iconPath:  string;
  iconBg:    string;
  iconColor: string;
}

export type ModalMode   = 'create' | 'edit' | 'view';
export type FilterMode  = 'all' | 'today' | 'week' | 'future';
export type ToastType   = 'success' | 'error';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-availabilty',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, DecimalPipe],
  templateUrl: './availabilty.component.html',
  styleUrls:   ['./availabilty.component.css' ],
})
export class AvailabiltyComponent implements OnInit {

  // ── Config ───────────────────────────────────────────────────────────────────
  private readonly DOCTOR_ID = 4;  // replace with value from AuthService
  private readonly BASE_URL  = '/api/availability'; // your API base URL

  // ── State ────────────────────────────────────────────────────────────────────

  isLoading    = true;
  isSaving     = false;
  modalOpen    = false;
  deleteConfirmOpen = false;
  apiError     = '';

  modalMode:   ModalMode  = 'create';
  filterMode:  FilterMode = 'all';
  searchQuery  = '';

  allSlots:      AvailabilitySlot[] = [];
  filteredSlots: AvailabilitySlot[] = [];

  activeSlot:    AvailabilitySlot | null = null;
  slotToDelete:  AvailabilitySlot | null = null;
  selectedSlotId = 0;

  summaryCards:  SummaryCard[] = [];

  // Quick-pick options
  readonly durationPresets = [15, 20, 30, 45, 60];
  readonly pricePresets    = [50, 100, 150, 200, 300];

  // Reactive form model
  form = this.emptyForm();

  // Toast
  toastVisible  = false;
  toastMessage  = '';
  toastType: ToastType = 'success';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private http: HttpClient,private _doctorservice:DoctorService) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadSlots();
    this._doctorservice.getDoctorAvailabilities(4).subscribe({
      next:(res)=>console.log(res),
      error:(err)=>console.log(err)
    });
  }

  // ── Data: Load all ───────────────────────────────────────────────────────────

  /**
   * GET /api/availability?doctorId=4
   * Adjust the endpoint to match your backend.
   */
  loadSlots(): void {
    this.isLoading = true;
    this.http.get<AvailabilitySlot[]>(`${this.BASE_URL}?doctorId=${this.DOCTOR_ID}`)
      .subscribe({
        next: (slots) => {
          this.allSlots = this.sortSlots(slots);
          this.applyFilter();
          this.buildSummary();
          this.isLoading = false;
        },
        error: () => {
          // Dev fallback — seed with mock data
          this.allSlots = this.mockSlots();
          this.applyFilter();
          this.buildSummary();
          this.isLoading = false;
        },
      });
  }

  // ── Data: Create ─────────────────────────────────────────────────────────────

  /**
   * POST /api/availability
   * Body: CreateSlotPayload
   */
  private createSlot(payload: CreateSlotPayload): void {
    this.isSaving = true;
    this.apiError = '';

    this.http.post<AvailabilitySlot>(this.BASE_URL, payload)
      .subscribe({
        next: (created) => {
          this.allSlots = this.sortSlots([created, ...this.allSlots]);
          this.applyFilter();
          this.buildSummary();
          this.isSaving = false;
          this.closeModal();
          this.showToast('Availability slot created successfully!', 'success');
        },
        error: (err) => {
          this.apiError = err?.error?.message ?? 'Failed to create slot. Please try again.';
          this.isSaving = false;
        },
      });
  }

  // ── Data: Update ─────────────────────────────────────────────────────────────

  /**
   * PUT /api/availability/:id
   * Body: UpdateSlotPayload
   */
  private updateSlot(payload: UpdateSlotPayload): void {
    this.isSaving = true;
    this.apiError = '';

    this.http.put<AvailabilitySlot>(
      `${this.BASE_URL}/${payload.DoctorAvailabilityId}`, payload
    ).subscribe({
      next: (updated) => {
        this.allSlots = this.sortSlots(
          this.allSlots.map(s =>
            s.DoctorAvailabilityId === updated.DoctorAvailabilityId ? updated : s
          )
        );
        this.applyFilter();
        this.buildSummary();
        this.isSaving = false;
        this.closeModal();
        this.showToast('Slot updated successfully!', 'success');
      },
      error: (err) => {
        this.apiError = err?.error?.message ?? 'Failed to update slot. Please try again.';
        this.isSaving = false;
      },
    });
  }

  // ── Data: Delete ─────────────────────────────────────────────────────────────

  /**
   * DELETE /api/availability/:id
   */
  private deleteSlot(id: number): void {
    this.isSaving = true;

    this.http.delete(`${this.BASE_URL}/${id}`)
      .subscribe({
        next: () => {
          this.allSlots = this.allSlots.filter(s => s.DoctorAvailabilityId !== id);
          this.applyFilter();
          this.buildSummary();
          this.isSaving     = false;
          this.deleteConfirmOpen = false;
          this.slotToDelete = null;
          this.showToast('Slot deleted.', 'success');
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message ?? 'Failed to delete slot.', 'error');
          this.deleteConfirmOpen = false;
        },
      });
  }

  // ── Modal Controls ───────────────────────────────────────────────────────────

  openModal(mode: ModalMode, slot?: AvailabilitySlot): void {
    this.modalMode  = mode;
    this.apiError   = '';
    this.activeSlot = slot ?? null;

    if (mode === 'create') {
      this.form = this.emptyForm();
    } else if ((mode === 'edit' || mode === 'view') && slot) {
      this.form = {
        availableFrom:          this.toDateTimeLocal(slot.availableFrom),
        maxPatients:            slot.maxPatients,
        sessionDurationMinutes: slot.sessionDurationMinutes,
        price:                  slot.price,
      };
    }

    this.modalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.modalOpen = false;
    this.apiError  = '';
    document.body.style.overflow = '';
    setTimeout(() => {
      this.activeSlot = null;
      this.form = this.emptyForm();
    }, 350);
  }

  submitForm(): void {
    if (this.modalMode === 'create') {
      const payload: CreateSlotPayload = {
        doctorId:               this.DOCTOR_ID,
        availableFrom:          this.toISO(this.form.availableFrom),
        maxPatients:            +this.form.maxPatients,
        sessionDurationMinutes: +this.form.sessionDurationMinutes,
        price:                  +this.form.price,
      };
      this.createSlot(payload);
    } else if (this.modalMode === 'edit' && this.activeSlot) {
      const payload: UpdateSlotPayload = {
        DoctorAvailabilityId:   this.activeSlot.DoctorAvailabilityId,
        doctorId:               this.DOCTOR_ID,
        availableFrom:          this.toISO(this.form.availableFrom),
        maxPatients:            +this.form.maxPatients,
        sessionDurationMinutes: +this.form.sessionDurationMinutes,
        price:                  +this.form.price,
      };
      this.updateSlot(payload);
    }
  }

  // ── Slot Selection ───────────────────────────────────────────────────────────

  selectSlot(slot: AvailabilitySlot): void {
    this.selectedSlotId =
      this.selectedSlotId === slot.DoctorAvailabilityId ? 0 : slot.DoctorAvailabilityId;
  }

  viewSlot(slot: AvailabilitySlot): void {
    this.openModal('view', slot);
  }

  // ── Delete Flow ──────────────────────────────────────────────────────────────

  confirmDelete(slot: AvailabilitySlot): void {
    this.slotToDelete     = slot;
    this.deleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.slotToDelete     = null;
  }

  executeDelete(): void {
    if (this.slotToDelete) {
      this.deleteSlot(this.slotToDelete.DoctorAvailabilityId);
    }
  }

  // ── Filter & Search ───────────────────────────────────────────────────────────

  setFilter(mode: FilterMode): void {
    this.filterMode = mode;
    this.applyFilter();
  }

  applyFilter(): void {
    const q   = this.searchQuery.toLowerCase().trim();
    const now = new Date();

    let result = this.allSlots.filter(slot => {
      const date = new Date(slot.availableFrom);
      switch (this.filterMode) {
        case 'today': {
          const d = new Date(date);
          return d.toDateString() === now.toDateString();
        }
        case 'week': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          return date >= startOfWeek && date <= endOfWeek;
        }
        case 'future':
          return date > now;
        default:
          return true;
      }
    });

    if (q) {
      result = result.filter(slot =>
        this.formatFullDate(slot.availableFrom).toLowerCase().includes(q) ||
        String(slot.price).includes(q) ||
        String(slot.maxPatients).includes(q) ||
        String(slot.DoctorAvailabilityId).includes(q) ||
        this.getDayName(slot.availableFrom).toLowerCase().includes(q)
      );
    }

    this.filteredSlots = result;
  }

  // ── Summary ───────────────────────────────────────────────────────────────────

  private buildSummary(): void {
    const now     = new Date();
    const future  = this.allSlots.filter(s => new Date(s.availableFrom) > now);
    const today   = this.allSlots.filter(s => new Date(s.availableFrom).toDateString() === now.toDateString());
    const avgPrice = this.allSlots.length
      ? this.allSlots.reduce((sum, s) => sum + s.price, 0) / this.allSlots.length
      : 0;

    this.summaryCards = [
      {
        label:     'Total Slots',
        value:     String(this.allSlots.length),
        iconPath:  'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        iconBg:    'rgba(0,212,200,0.10)',
        iconColor: '#00d4c8',
      },
      {
        label:     'Upcoming',
        value:     String(future.length),
        iconPath:  'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        iconBg:    'rgba(129,140,248,0.12)',
        iconColor: '#818cf8',
      },
      {
        label:     'Today',
        value:     String(today.length),
        iconPath:  'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
        iconBg:    'rgba(240,180,41,0.12)',
        iconColor: '#f0b429',
      },
      {
        label:     'Avg. Price',
        value:     avgPrice > 0 ? `${Math.round(avgPrice)} EGP` : '—',
        iconPath:  'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        iconBg:    'rgba(244,63,94,0.10)',
        iconColor: '#f43f5e',
      },
    ];
  }

  // ── Date Helpers ──────────────────────────────────────────────────────────────

  getMonth(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  }

  getDay(iso: string): string {
    return String(new Date(iso).getDate()).padStart(2, '0');
  }

  getYear(iso: string): string {
    return String(new Date(iso).getFullYear());
  }

  getDayName(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'long' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  formatFullDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  formatPreviewDate(local: string): string {
    if (!local) return '';
    try {
      return this.formatFullDate(local) + ' at ' + this.formatTime(local);
    } catch { return local; }
  }

  isPast(iso: string): boolean {
    return new Date(iso) < new Date();
  }

  /** Convert ISO string to datetime-local input format */
  private toDateTimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Convert datetime-local string to ISO for API */
  private toISO(local: string): string {
    return new Date(local).toISOString().replace('Z', '').split('.')[0];
  }

  // ── Misc ─────────────────────────────────────────────────────────────────────

  trackById(_: number, slot: AvailabilitySlot): number {
    return slot.DoctorAvailabilityId;
  }

  private sortSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
    return [...slots].sort(
      (a, b) => new Date(a.availableFrom).getTime() - new Date(b.availableFrom).getTime()
    );
  }

  private emptyForm() {
    return {
      availableFrom:          '',
      maxPatients:            20,
      sessionDurationMinutes: 30,
      price:                  150,
    };
  }

  // ── Toast ─────────────────────────────────────────────────────────────────────

  showToast(message: string, type: ToastType = 'success'): void {
    clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType    = type;
    this.toastVisible = true;
    this.toastTimer   = setTimeout(() => { this.toastVisible = false; }, 3500);
  }

  // ── Mock Data (dev / fallback) ────────────────────────────────────────────────

  private mockSlots(): AvailabilitySlot[] {
    const base = new Date();
    const mk = (offsetDays: number, h: number, id: number): AvailabilitySlot => {
      const d = new Date(base);
      d.setDate(d.getDate() + offsetDays);
      d.setHours(h, 30, 0, 0);
      return {
        DoctorAvailabilityId:   id,
        doctorId:               this.DOCTOR_ID,
        availableFrom:          d.toISOString().replace('Z',''),
        maxPatients:            [10, 15, 20, 25][id % 4],
        sessionDurationMinutes: [15, 20, 30, 45][id % 4],
        price:                  [100, 120, 150, 200][id % 4],
      };
    };
    return [
      mk(-1, 9, 1),
      mk(0,  10, 2),
      mk(0,  14, 3),
      mk(1,  9,  4),
      mk(1,  11, 5),
      mk(2,  10, 6),
      mk(3,  13, 7),
      mk(5,  9,  8),
    ];
  }
}