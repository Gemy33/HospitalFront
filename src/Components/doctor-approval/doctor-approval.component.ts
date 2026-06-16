import { Component, computed, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddAdmin, AdminService, Doctor, Gender } from '../../Core/admin.service';
import { RouterLink } from '@angular/router';

type Tab = 'overview' | 'doctors' | 'admins';
type ModalMode = 'add' | 'edit';

@Component({
  selector: 'app-doctor-approval',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterLink],
  templateUrl: './doctor-approval.component.html',
  styleUrls: ['./doctor-approval.component.scss']
})
export class DoctorApprovalComponent implements OnInit {

  activeTab = signal<Tab>('overview');

  admins         = signal<AddAdmin[]>([]);
  pendingDoctors = signal<Doctor[]>([]);
  selectedDoctor = signal<Doctor | null>(null);

showDoctorModal = signal(false);

loadingDoctorDetails = signal(false);

  loadingAdmins  = signal(false);
  loadingDoctors = signal(false);
  savingAdmin    = signal(false);
  approvingId    = signal<number | null>(null);
  deletingId     = signal<number | null>(null);

  errorAdmins    = signal<string | null>(null);
  errorDoctors   = signal<string | null>(null);
  errorModal     = signal<string | null>(null);

  showModal  = signal(false);
  modalMode  = signal<ModalMode>('add');
  modalForm  = signal<AddAdmin>({
    name: '', email: '', password: '', phone: '', gender: Gender.Male
  });

  adminSearch  = signal('');
  doctorSearch = signal('');

  filteredAdmins = computed(() => {
    const term = this.adminSearch().toLowerCase().trim();
    return this.admins().filter(a =>
      !term ||
      a.name.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term)
    );
  });

  filteredDoctors = computed(() => {
    const term = this.doctorSearch().toLowerCase().trim();
    return this.pendingDoctors().filter(d =>
      !term ||
      (d.name ?? '').toLowerCase().includes(term) ||
      (d.speciality ?? '').toLowerCase().includes(term)
    );
  });

  stats = computed(() => ({
    totalAdmins:  this.admins().length,
    pendingCount: this.pendingDoctors().length,
  }));

  closeDoctorModal(): void {

  this.showDoctorModal.set(false);

  this.selectedDoctor.set(null);
}
  openDoctorDetails(id: number): void {

  this.loadingDoctorDetails.set(true);

  this.adminSvc.getDoctor(id).subscribe({

    next: (doctor) => {

      this.selectedDoctor.set(doctor);

      this.showDoctorModal.set(true);

      this.loadingDoctorDetails.set(false);
    },

    error: () => {

      this.loadingDoctorDetails.set(false);

      this.errorDoctors.set(
        'Failed to load doctor details.'
      );
    }

  });

}
  // ── Chart data ───────────────────────────────────────────────
  genderChartData = computed(() => {
    const male   = this.admins().filter(a => a.gender === Gender.Male).length;
    const female = this.admins().filter(a => a.gender === Gender.Female).length;
    return { male, female, total: male + female };
  });

  doctorSpecialityData = computed(() => {
    const map = new Map<string, number>();
    this.pendingDoctors().forEach(d => {
      const spec = d.speciality ?? 'Unknown';
      map.set(spec, (map.get(spec) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  });

  readonly Gender = Gender;

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void {
    this.loadAdmins();
    this.loadPendingDoctors();
  }

  // ── Loaders ──────────────────────────────────────────────────

  loadAdmins(): void {
    this.loadingAdmins.set(true);
    this.errorAdmins.set(null);
    this.adminSvc.getAllAdmins().subscribe({
      next: (data: AddAdmin[]) => {
        this.admins.set(Array.isArray(data) ? data : []);
        this.loadingAdmins.set(false);
      },
      error: () => {
        this.errorAdmins.set('Failed to load admins.');
        this.loadingAdmins.set(false);
      },
    });
  }

  loadPendingDoctors(): void {
    this.loadingDoctors.set(true);
    this.errorDoctors.set(null);
    this.adminSvc.getPendingDoctors().subscribe({
      next: (data: Doctor[]) => {
        this.pendingDoctors.set(Array.isArray(data) ? data : []);
        this.loadingDoctors.set(false);
      },
      error: () => {
        this.errorDoctors.set('Failed to load pending doctors.');
        this.loadingDoctors.set(false);
      },
    });
  }

  setTab(tab: Tab): void { this.activeTab.set(tab); }

  // ── Approve ──────────────────────────────────────────────────

  approveDoctor(id: number): void {
      const confirmed = confirm(
    'Are you sure you want to approve this doctor?'
  );

  if (!confirmed) return;
    this.approvingId.set(id);
    this.adminSvc.approveDoctor(id).subscribe({
      next: () => {
        // ✅ Remove from list immediately — no reload needed
        this.pendingDoctors.update(list => list.filter(d => d.id !== id));
        this.approvingId.set(null);
      },
      error: () => {
        this.approvingId.set(null);
        this.errorDoctors.set('Failed to approve doctor.');
      },
    });
  }

  // ── Modal ────────────────────────────────────────────────────

  openAdd(): void {
    this.modalForm.set({ name: '', email: '', password: '', phone: '', gender: Gender.Male });
    this.modalMode.set('add');
    this.errorModal.set(null);
    this.showModal.set(true);
  }

  openEdit(admin: AddAdmin): void {
    this.modalForm.set({ ...admin, password: '' });
    this.modalMode.set('edit');
    this.errorModal.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.errorModal.set(null);
  }

  updateForm(field: keyof AddAdmin, value: any): void {
    this.modalForm.update(f => ({ ...f, [field]: value }));
  }

  saveAdmin(): void {
    const form = this.modalForm();
    if (!form.name.trim() || !form.email.trim()) {
      this.errorModal.set('Name and email are required.');
      return;
    }

    this.savingAdmin.set(true);
    this.errorModal.set(null);

    if (this.modalMode() === 'add') {
      this.adminSvc.addAdmin(form).subscribe({
        next: (created: any) => {
          // ✅ Add new admin directly to list — no reload
          const newAdmin: AddAdmin = {
            ...form,
            id: created?.id ?? Date.now(),
          };
          this.admins.update(list => [...list, newAdmin]);
          this.savingAdmin.set(false);
          this.showModal.set(false);
        },
        error: () => {
          this.savingAdmin.set(false);
          this.errorModal.set('Failed to create admin.');
        },
      });
    } else {
      this.adminSvc.updateAdmin(form).subscribe({
        next: () => {
          // ✅ Update admin in list directly — no reload
          this.admins.update(list =>
            list.map(a => a.id === form.id ? { ...form } : a)
          );
          this.savingAdmin.set(false);
          this.showModal.set(false);
        },
        error: () => {
          this.savingAdmin.set(false);
          this.errorModal.set('Failed to update admin.');
        },
      });
    }
  }

  deleteAdmin(id: number): void {
      const confirmed = confirm(
    'Are you sure you want to delete this admin?'
  );

  if (!confirmed) return;

    this.deletingId.set(id);
    this.adminSvc.deleteAdmin(id).subscribe({
      next: () => {
        // ✅ Remove from list directly — no reload
        this.admins.update(list => list.filter(a => a.id !== id));
        this.deletingId.set(null);
      },
      error: () => {
        this.deletingId.set(null);
        this.errorAdmins.set('Failed to delete admin.');
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  getInitials(name: string): string {
    if (!name?.trim()) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  genderLabel(g: Gender): string { return g === Gender.Female ? 'Female' : 'Male'; }
  genderIcon(g: Gender): string  { return g === Gender.Female ? '♀' : '♂'; }

  // ── Chart helpers ────────────────────────────────────────────

  getBarWidth(count: number, max: number): string {
    if (max === 0) return '0%';
    return `${Math.round((count / max) * 100)}%`;
  }

  getMaxSpecCount(): number {
    const data = this.doctorSpecialityData();
    return data.length ? Math.max(...data.map(d => d.count)) : 1;
  }

  getMalePercent(): number {
    const d = this.genderChartData();
    return d.total === 0 ? 0 : Math.round((d.male / d.total) * 100);
  }

  getFemalePercent(): number {
    const d = this.genderChartData();
    return d.total === 0 ? 0 : Math.round((d.female / d.total) * 100);
  }

  getDonutDash(percent: number): string {
    const c = 2 * Math.PI * 40; // circumference for r=40
    return `${(percent / 100) * c} ${c}`;
  }
}