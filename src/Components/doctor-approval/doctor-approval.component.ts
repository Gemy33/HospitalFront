import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common'; // Added this
import { FormsModule } from '@angular/forms';
import { AddAdmin, AdminService, Doctor, Gender } from '../../Core/admin.service';
type Tab = 'overview' | 'doctors' | 'admins';
type ModalMode = 'add' | 'edit';
@Component({
  selector: 'app-doctor-approval',
  standalone: true,
  imports: [CommonModule, FormsModule], // Added CommonModule here
  templateUrl: './doctor-approval.component.html',
  styleUrls: ['./doctor-approval.component.scss']
})









export class DoctorApprovalComponent implements OnInit {

  // ── Tabs ────────────────────────────────────────────────────
  activeTab = signal<Tab>('overview');

  // ── Data ────────────────────────────────────────────────────
  admins          = signal<AddAdmin[]>([]);
  pendingDoctors  = signal<Doctor[]>([]);

  // ── Loading states ──────────────────────────────────────────
  loadingAdmins   = signal(false);
  loadingDoctors  = signal(false);
  savingAdmin     = signal(false);
  approvingId     = signal<number | null>(null);
  deletingId      = signal<number | null>(null);

  // ── Errors ──────────────────────────────────────────────────
  errorAdmins     = signal<string | null>(null);
  errorDoctors    = signal<string | null>(null);
  errorModal      = signal<string | null>(null);

  // ── Modal ───────────────────────────────────────────────────
  showModal   = signal(false);
  modalMode   = signal<ModalMode>('add');
  modalForm   = signal<AddAdmin>({
    name: '', email: '', password: '', phone: '', gender: Gender.Male
  });

  // ── Search ──────────────────────────────────────────────────
  adminSearch  = signal('');
  doctorSearch = signal('');

  filteredAdmins = computed(() => {
    const term = this.adminSearch().toLowerCase();
    return this.admins().filter(a =>
      !term ||
      a.name.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term)
    );
  });

  filteredDoctors = computed(() => {
    const term = this.doctorSearch().toLowerCase();
    return this.pendingDoctors().filter(d =>
      !term ||
      (d.name ?? '').toLowerCase().includes(term) ||
      (d.speciality ?? '').toLowerCase().includes(term)
    );
  });

  // ── Stats ───────────────────────────────────────────────────
  stats = computed(() => ({
    totalAdmins:   this.admins().length,
    pendingCount:  this.pendingDoctors().length,
  }));

  readonly Gender = Gender;

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void {
    this.loadAdmins();
    this.loadPendingDoctors();
  }

  // ── Loaders ─────────────────────────────────────────────────

  loadAdmins(): void {
    this.loadingAdmins.set(true);
    this.errorAdmins.set(null);
    this.adminSvc.getAllAdmins().subscribe({
      next: data  => { this.admins.set(data); this.loadingAdmins.set(false); },
      error: ()   => { this.errorAdmins.set('Failed to load admins.'); this.loadingAdmins.set(false); },
    });
  }

  loadPendingDoctors(): void {
    this.loadingDoctors.set(true);
    this.errorDoctors.set(null);
    this.adminSvc.getPendingDoctors().subscribe({
      next: data  => { this.pendingDoctors.set(data); this.loadingDoctors.set(false); },
      error: ()   => { this.errorDoctors.set('Failed to load pending doctors.'); this.loadingDoctors.set(false); },
    });
  }

  // ── Tab ─────────────────────────────────────────────────────

  setTab(tab: Tab): void { this.activeTab.set(tab); }

  // ── Approve doctor ──────────────────────────────────────────

  approveDoctor(id: number): void {
    this.approvingId.set(id);
    this.adminSvc.approveDoctor(id).subscribe({
      next: () => {
        this.pendingDoctors.update(list => list.filter(d => d.id !== id));
        this.approvingId.set(null);
      },
      error: () => { this.approvingId.set(null); },
    });
  }

  // ── Admin modal ─────────────────────────────────────────────

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

  closeModal(): void { this.showModal.set(false); }

  updateForm(field: keyof AddAdmin, value: any): void {
    this.modalForm.update(f => ({ ...f, [field]: value }));
  }

  saveAdmin(): void {
    const form = this.modalForm();
    if (!form.name || !form.email) {
      this.errorModal.set('Name and email are required.');
      return;
    }

    this.savingAdmin.set(true);
    this.errorModal.set(null);

    const call = this.modalMode() === 'add'
      ? this.adminSvc.addAdmin(form)
      : this.adminSvc.updateAdmin(form);

    call.subscribe({
      next: () => {
        this.savingAdmin.set(false);
        this.showModal.set(false);
        this.loadAdmins();
      },
      error: () => {
        this.savingAdmin.set(false);
        this.errorModal.set('Operation failed. Please try again.');
      },
    });
  }

  deleteAdmin(id: number): void {
    this.deletingId.set(id);
    this.adminSvc.deleteAdmin(id).subscribe({
      next: () => {
        this.admins.update(list => list.filter(a => a.id !== id));
        this.deletingId.set(null);
      },
      error: () => { this.deletingId.set(null); },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────

  getInitials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  genderLabel(g: Gender): string { return g === Gender.Female ? 'Female' : 'Male'; }
  genderIcon(g: Gender):  string { return g === Gender.Female ? '♀' : '♂'; }
}