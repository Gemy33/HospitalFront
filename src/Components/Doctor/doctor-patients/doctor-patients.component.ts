// doctor-patients.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DoctorService } from '../../../Core/doctor.service';

// ══════════════════════════════════════════════════════════════════════════════
// INTERFACES — matching the real API response exactly
// ══════════════════════════════════════════════════════════════════════════════

export interface ApiPatientAddress {
  street:  string;
  city:    string;
  country: string;
}

export interface ApiPatientUser {
  id:          number;
  userName:    string;
  email:       string;
  phoneNumber: string;
  gender:      number;   // 1=Male, 2=Female, 0=Other
  createdAt:   string;
  updatedAt:   string;
}

export interface ApiPatientData {
  id:           number;
  userId:       number;
  dateOfBirath: string;   // API typo preserved
  address:      ApiPatientAddress;
  user:         ApiPatientUser;
  createdAt:    string;
  updatedAt:    string;
}

export interface ApiTreatment {
  id:             number;
  prescriptionId: number;
  medicationName: string;
  notes:          string;
  createdAt:      string;
  updatedAt:      string;
}

/** Each item in the API array IS a prescription with patient nested */
export interface ApiPrescriptionRecord {
  id:        number;
  doctorId:  number;
  doctor:    null;
  patientId: number;
  patient:   ApiPatientData;
  diagnosis: string;
  treatments: ApiTreatment[];
  createdAt: string;
  updatedAt: string;
}

// ── Grouped UI model ──────────────────────────────────────────────────────────

export interface Prescription {
  id:         number;
  doctorId:   number;
  patientId:  number;
  diagnosis:  string;
  treatments: ApiTreatment[];
  createdAt:  string;
}

export interface PatientWithPrescriptions {
  patient:       ApiPatientData;
  prescriptions: Prescription[];
  // UI state
  expanded:    boolean;
  rxExpanded:  Record<number, boolean>;
  chatOpen:    boolean;
  uploadOpen:  boolean;
  chatMessages: ChatMessage[];
  attachments:  Attachment[];
}

export interface ChatMessage {
  id:        number;
  text:      string;
  sender:    'doctor' | 'patient';
  timestamp: Date;
  type:      'message' | 'instruction';
}

export interface Attachment {
  id:   number;
  name: string;
  size: string;
  type: string;
  url:  string;
  date: Date;
}

export type FilterDateRange = 'all' | 'today' | 'week' | 'month';

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

@Component({
  selector:    'app-my-patients',
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './doctor-patients.component.html',
  styleUrl:    './doctor-patients.component.css',
})
export class DoctorPatientsComponent implements OnInit {

  private fb            = inject(FormBuilder);
  private doctorService = inject(DoctorService);

  // ── State ─────────────────────────────────────────────────────────────────

  allPatients:      PatientWithPrescriptions[] = [];
  filteredPatients: PatientWithPrescriptions[] = [];

  searchQuery     = '';
  filterDate:     FilterDateRange = 'all';
  filterKeyword   = '';
  filterDiagnosis = '';
  isLoading       = false;

  messageForm: FormGroup = this.fb.group({
    text: ['', Validators.required],
    type: ['message'],
  });

  generatingPdf = false;
  pdfPatientId: number | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadPatients();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  loadPatients(): void {
    this.isLoading = true;

    this.doctorService.getDoctorPatientsWithHisPrescriptions(8).subscribe({
      next: (res: ApiPrescriptionRecord[]) => {
        console.log(res);
        this.allPatients = this.groupByPatient(res);
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        // Fallback to mock data so UI is still usable in development
        this.allPatients = this.groupByPatient(this.mockApiResponse());
        this.applyFilters();
        this.isLoading = false;
      },
    });
  }

  /**
   * The API returns one record PER PRESCRIPTION (same patient can appear
   * multiple times). This groups all prescription records by patientId
   * so each patient appears once in the UI with all their prescriptions listed.
   */
  private groupByPatient(records: ApiPrescriptionRecord[]): PatientWithPrescriptions[] {
    const map = new Map<number, PatientWithPrescriptions>();

    records.forEach(record => {
      const pid = record.patientId;

      if (!map.has(pid)) {
        map.set(pid, {
          patient:       record.patient,
          prescriptions: [],
          expanded:      false,
          rxExpanded:    {},
          chatOpen:      false,
          uploadOpen:    false,
          chatMessages:  [],
          attachments:   [],
        });
      }

      // Add this prescription to the patient's list
      map.get(pid)!.prescriptions.push({
        id:         record.id,
        doctorId:   record.doctorId,
        patientId:  record.patientId,
        diagnosis:  record.diagnosis,
        treatments: record.treatments,
        createdAt:  record.createdAt,
      });
    });

    return Array.from(map.values());
  }

  // ── Mock data (fallback / dev) ────────────────────────────────────────────

  private mockApiResponse(): ApiPrescriptionRecord[] {
    return [
      {
        id: 6, doctorId: 4, doctor: null, patientId: 1,
        diagnosis: 'Upper respiratory tract infection',
        createdAt: '2026-03-12T08:30:00', updatedAt: '',
        patient: {
          id: 1, userId: 1002, dateOfBirath: '1995-06-15',
          address: { street: '123 Nile St', city: 'Cairo', country: 'Egypt' },
          createdAt: '', updatedAt: '',
          user: { id: 1002, userName: 'AhmedFHassan', email: 'ahmed@example.com', phoneNumber: '+201234567890', gender: 1, createdAt: '', updatedAt: '' },
        },
        treatments: [
          { id: 1, prescriptionId: 6, medicationName: 'Paracetamol 500mg', notes: 'Take twice daily after meals', createdAt: '2026-03-12T08:30:00', updatedAt: '' },
          { id: 2, prescriptionId: 6, medicationName: 'Ibuprofen 400mg',   notes: 'Take once daily after food',  createdAt: '2026-03-12T08:30:00', updatedAt: '' },
        ],
      },
      {
        id: 9, doctorId: 4, doctor: null, patientId: 1,
        diagnosis: 'Seasonal allergies',
        createdAt: '2026-04-01T10:00:00', updatedAt: '',
        patient: {
          id: 1, userId: 1002, dateOfBirath: '1995-06-15',
          address: { street: '123 Nile St', city: 'Cairo', country: 'Egypt' },
          createdAt: '', updatedAt: '',
          user: { id: 1002, userName: 'AhmedFHassan', email: 'ahmed@example.com', phoneNumber: '+201234567890', gender: 1, createdAt: '', updatedAt: '' },
        },
        treatments: [
          { id: 7, prescriptionId: 9, medicationName: 'Cetirizine 10mg', notes: 'Once daily before bedtime',    createdAt: '2026-04-01T10:00:00', updatedAt: '' },
          { id: 8, prescriptionId: 9, medicationName: 'Nasal spray',     notes: 'Two sprays each nostril daily', createdAt: '2026-04-01T10:00:00', updatedAt: '' },
        ],
      },
      {
        id: 7, doctorId: 4, doctor: null, patientId: 2,
        diagnosis: 'Type 2 diabetes follow-up',
        createdAt: '2026-03-15T09:00:00', updatedAt: '',
        patient: {
          id: 2, userId: 2002, dateOfBirath: '1998-07-14',
          address: { street: 'El Horreya Street', city: 'Beni Suef', country: 'Egypt' },
          createdAt: '', updatedAt: '',
          user: { id: 2002, userName: 'IslamAhmed', email: 'islam@example.com', phoneNumber: '+201001234567', gender: 1, createdAt: '', updatedAt: '' },
        },
        treatments: [
          { id: 3, prescriptionId: 7, medicationName: 'Metformin 850mg',   notes: 'Twice daily with meals',    createdAt: '2026-03-15T09:00:00', updatedAt: '' },
          { id: 4, prescriptionId: 7, medicationName: 'Vitamin D3 1000IU', notes: 'Once daily with breakfast', createdAt: '2026-03-15T09:00:00', updatedAt: '' },
        ],
      },
      {
        id: 8, doctorId: 4, doctor: null, patientId: 3,
        diagnosis: 'Tension headache — chronic',
        createdAt: '2026-03-20T14:00:00', updatedAt: '',
        patient: {
          id: 3, userId: 3002, dateOfBirath: '1990-03-22',
          address: { street: 'El Gomhoria St.', city: 'Beni Suef', country: 'Egypt' },
          createdAt: '', updatedAt: '',
          user: { id: 3002, userName: 'SaraKhaled', email: 'sara@example.com', phoneNumber: '+201112223344', gender: 2, createdAt: '', updatedAt: '' },
        },
        treatments: [
          { id: 5, prescriptionId: 8, medicationName: 'Amitriptyline 25mg', notes: 'Once nightly, increase if needed', createdAt: '2026-03-20T14:00:00', updatedAt: '' },
          { id: 6, prescriptionId: 8, medicationName: 'Magnesium 400mg',    notes: 'Once daily with dinner',           createdAt: '2026-03-20T14:00:00', updatedAt: '' },
        ],
      },
    ];
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  applyFilters(): void {
    let result = [...this.allPatients];

    // 1. Name / email / city search
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(pw =>
        pw.patient.user.userName.toLowerCase().includes(q)   ||
        pw.patient.user.email.toLowerCase().includes(q)      ||
        pw.patient.user.phoneNumber.includes(q)              ||
        pw.patient.address.city.toLowerCase().includes(q)
      );
    }

    // 2. Treatment name or notes keyword
    const kw = this.filterKeyword.toLowerCase().trim();
    if (kw) {
      result = result.filter(pw =>
        pw.prescriptions.some(rx =>
          rx.treatments.some(t =>
            t.notes.toLowerCase().includes(kw) ||
            t.medicationName.toLowerCase().includes(kw)
          )
        )
      );
    }

    // 3. Diagnosis keyword
    const diag = this.filterDiagnosis.toLowerCase().trim();
    if (diag) {
      result = result.filter(pw =>
        pw.prescriptions.some(rx => rx.diagnosis.toLowerCase().includes(diag))
      );
    }

    // 4. Date filter — based on latest prescription createdAt
    if (this.filterDate !== 'all') {
      const now   = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(pw => {
        const dates = pw.prescriptions
          .map(rx => new Date(rx.createdAt))
          .filter(d => !isNaN(d.getTime()));
        if (!dates.length) return false;
        const latest = new Date(Math.max(...dates.map(d => d.getTime())));
        if (this.filterDate === 'today')
          return latest.toDateString() === today.toDateString();
        if (this.filterDate === 'week') {
          const ago = new Date(today); ago.setDate(today.getDate() - 7);
          return latest >= ago;
        }
        if (this.filterDate === 'month') {
          const ago = new Date(today); ago.setMonth(today.getMonth() - 1);
          return latest >= ago;
        }
        return true;
      });
    }

    this.filteredPatients = result;
  }

  clearFilters(): void {
    this.searchQuery = this.filterKeyword = this.filterDiagnosis = '';
    this.filterDate  = 'all';
    this.applyFilters();
  }

  activeFiltersCount(): number {
    return [this.searchQuery, this.filterKeyword, this.filterDiagnosis,
            this.filterDate !== 'all' ? '1' : ''].filter(s => s.trim()).length;
  }

  // ── UI toggles ────────────────────────────────────────────────────────────

  toggleExpand(pw: PatientWithPrescriptions): void { pw.expanded = !pw.expanded; }

  toggleRx(pw: PatientWithPrescriptions, rxId: number): void {
    pw.rxExpanded[rxId] = !pw.rxExpanded[rxId];
  }

  openChat(pw: PatientWithPrescriptions): void {
    this.allPatients.forEach(p => { if (p !== pw) p.chatOpen = false; });
    pw.chatOpen   = !pw.chatOpen;
    pw.uploadOpen = false;
  }

  openUpload(pw: PatientWithPrescriptions): void {
    pw.uploadOpen = !pw.uploadOpen;
    pw.chatOpen   = false;
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  sendMessage(pw: PatientWithPrescriptions): void {
    const val = this.messageForm.value;
    if (!val.text?.trim()) return;
    pw.chatMessages = [...pw.chatMessages, {
      id: Date.now(), text: val.text.trim(),
      sender: 'doctor', timestamp: new Date(), type: val.type ?? 'message',
    }];
    this.messageForm.reset({ text: '', type: 'message' });
    // TODO: this.doctorService.sendMessage(pw.patient.id, msg).subscribe();
  }

  // ── File upload ───────────────────────────────────────────────────────────

  onFileSelected(event: Event, pw: PatientWithPrescriptions): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files?.length) return;
    Array.from(files).forEach(file => {
      pw.attachments = [...pw.attachments, {
        id: Date.now() + Math.random(), name: file.name,
        size: this.formatBytes(file.size),
        type: file.type.includes('image') ? 'img' : 'pdf',
        url: URL.createObjectURL(file), date: new Date(),
      }];
      // TODO: this.doctorService.uploadAttachment(pw.patient.id, fd).subscribe();
    });
    (event.target as HTMLInputElement).value = '';
  }

  removeAttachment(pw: PatientWithPrescriptions, attId: number): void {
    pw.attachments = pw.attachments.filter(a => a.id !== attId);
    // TODO: this.doctorService.deleteAttachment(attId).subscribe();
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  downloadPdf(pw: PatientWithPrescriptions): void {
    this.generatingPdf = true;
    this.pdfPatientId  = pw.patient.id;
    const p   = pw.patient;
    const rxs = pw.prescriptions;

    const rxHtml = rxs.map(rx => `
      <div style="margin:16px 0;padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8faff">
        <div style="font-weight:600;color:#1a3d7a;margin-bottom:4px">
          Rx #${rx.id} — <em style="color:#555;font-weight:400">${rx.diagnosis}</em>
        </div>
        ${rx.treatments.map(t => `
          <div style="margin:6px 0 6px 12px;padding:8px;background:#fff;border-radius:6px;border:1px solid #e2e8f0">
            <strong>${t.medicationName}</strong><br>
            <span style="color:#666;font-size:13px">${t.notes}</span>
          </div>`).join('')}
      </div>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Patient History — ${p.user.userName}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#1a202c;max-width:800px;margin:0 auto}
      h1{font-size:22px;color:#0B2447;border-bottom:2px solid #0B2447;padding-bottom:8px}
      .meta{display:flex;gap:32px;margin:16px 0 24px;font-size:14px;flex-wrap:wrap}
      .meta div{display:flex;flex-direction:column;gap:3px}
      .meta label{color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
      @media print{button{display:none}}</style></head>
      <body>
        <h1>Patient Prescription History</h1>
        <div class="meta">
          <div><label>Name</label><strong>${this.formatDisplayName(p.user.userName)}</strong></div>
          <div><label>Gender</label><strong>${this.genderLabel(p.user.gender)}</strong></div>
          <div><label>DOB</label><strong>${p.dateOfBirath}</strong></div>
          <div><label>Phone</label><strong>${p.user.phoneNumber}</strong></div>
          <div><label>City</label><strong>${p.address.city}, ${p.address.country}</strong></div>
        </div>
        <h2 style="font-size:16px;color:#0B2447">Prescriptions (${rxs.length})</h2>
        ${rxHtml || '<p style="color:#888">No prescriptions recorded.</p>'}
        <p style="margin-top:32px;font-size:12px;color:#aaa">Generated ${new Date().toLocaleDateString()}</p>
      </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
    setTimeout(() => { this.generatingPdf = false; this.pdfPatientId = null; }, 1200);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Display name from API: "islamFathy" → "Islam Fathy" */
  formatDisplayName(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').trim();
  }

  getInitials(name: string): string {
    const clean = name.replace(/\d+/g, '').trim();
    const parts = clean.split(/(?=[A-Z])/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }

  genderLabel(g: number): string {
    return g === 1 ? 'Male' : g === 2 ? 'Female' : 'Other';
  }

  age(dob: string): number {
    const d = new Date(dob), n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
    return a;
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso; }
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return ''; }
  }

  private formatBytes(b: number): string {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  totalRxCount(): number {
    return this.allPatients.reduce((s, pw) => s + pw.prescriptions.length, 0);
  }

  patientsWithRxCount(): number {
    return this.allPatients.filter(pw => pw.prescriptions.length > 0).length;
  }
}