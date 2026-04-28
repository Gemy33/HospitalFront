

// my-patients.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Patient {
  id:          number;
  name:        string;
  gender:      number;   // 1=Male, 2=Female, 0=Other
  email:       string;
  phone:       string;
  street:      string;
  city:        string;
  country:     string;
  dateOfBirth: string;
}

export interface Treatment {
  id:             number;
  prescriptionId: number;
  medicationName: string;
  notes:          string;
  createdAt:      string;
  updatedAt:      string;
}

export interface Prescription {
  id:         number;
  doctorId:   number;
  patientId:  number;
  diagnosis:  string;
  treatments: Treatment[];
}

export interface PatientWithPrescriptions {
  patient:       Patient;
  prescriptions: Prescription[];
  // UI state
  expanded:       boolean;
  rxExpanded:     Record<number, boolean>;
  chatOpen:       boolean;
  uploadOpen:     boolean;
  chatMessages:   ChatMessage[];
  attachments:    Attachment[];
}

export interface ChatMessage {
  id:        number;
  text:      string;
  sender:    'doctor' | 'patient';
  timestamp: Date;
  type:      'message' | 'instruction';
}

export interface Attachment {
  id:       number;
  name:     string;
  size:     string;
  type:     string;
  url:      string;
  date:     Date;
}

export type FilterDateRange = 'all' | 'today' | 'week' | 'month';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector:    'app-my-patients',
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
   templateUrl: './doctor-patients.component.html',
  styleUrl: './doctor-patients.component.css'
})
export class DoctorPatientsComponent implements OnInit {

  private fb = inject(FormBuilder);

  // ── State ─────────────────────────────────────────────────────────────────

  allPatients:      PatientWithPrescriptions[] = [];
  filteredPatients: PatientWithPrescriptions[] = [];

  searchQuery     = '';
  filterDate:     FilterDateRange = 'all';
  filterKeyword   = '';       // filter by notes keyword or treatment name
  filterDiagnosis = '';       // filter by diagnosis keyword

  isLoading = false;

  // Chat / message form
  messageForm: FormGroup = this.fb.group({
    text:    ['', Validators.required],
    type:    ['message'],     // 'message' | 'instruction'
  });

  // Active patient for chat / upload panels
  activeChatPatientId:   number | null = null;
  activeUploadPatientId: number | null = null;

  // PDF generation state
  generatingPdf = false;
  pdfPatientId: number | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Load mock data — replace with:
    // this.doctorService.getMyPatients().subscribe(res => { ... })
    this.loadMockData();
    this.applyFilters();
  }

  // ── Load / mock data ──────────────────────────────────────────────────────

  private loadMockData(): void {
    const mockPatients: Patient[] = [
      { id: 1, name: 'AhmedFHassan',   gender: 1, email: 'ahmed.hassan@example.com',  phone: '+201234567890', street: '123 Nile Street',   city: 'Cairo',     country: 'Egypt',  dateOfBirth: '1995-06-15' },
      { id: 2, name: 'IslamAhmed',     gender: 1, email: 'islam.ahmed@example.com',   phone: '+201001234567', street: 'El Horreya Street',  city: 'Beni Suef', country: 'Egypt',  dateOfBirth: '1998-07-14' },
      { id: 3, name: 'SaraKhaled',     gender: 2, email: 'sara.khaled@example.com',   phone: '+201112223344', street: 'El Gomhoria St.',    city: 'Beni Suef', country: 'Egypt',  dateOfBirth: '1990-03-22' },
      { id: 4, name: 'MohamedAli',     gender: 1, email: 'mohamed.ali@example.com',   phone: '+201223334455', street: '5 Garden City Road', city: 'Giza',      country: 'Egypt',  dateOfBirth: '1985-11-30' },
      { id: 5, name: 'NourElSayed',    gender: 2, email: 'nour.elsayed@example.com',  phone: '+201556789012', street: '88 Tahrir Square',   city: 'Cairo',     country: 'Egypt',  dateOfBirth: '2000-01-08' },
    ];

    const mockPrescriptions: Record<number, Prescription[]> = {
      1: [
        {
          id: 6, doctorId: 4, patientId: 1,
          diagnosis: 'Upper respiratory tract infection',
          treatments: [
            { id: 1, prescriptionId: 6, medicationName: 'Paracetamol 500mg', notes: 'Take twice daily after meals',  createdAt: '2026-03-12T08:30:00', updatedAt: '' },
            { id: 2, prescriptionId: 6, medicationName: 'Ibuprofen 400mg',   notes: 'Take once daily after food',   createdAt: '2026-03-12T08:30:00', updatedAt: '' },
          ],
        },
        {
          id: 9, doctorId: 4, patientId: 1,
          diagnosis: 'Seasonal allergies',
          treatments: [
            { id: 7, prescriptionId: 9, medicationName: 'Cetirizine 10mg',   notes: 'Once daily before bedtime',    createdAt: '2026-04-01T10:00:00', updatedAt: '' },
            { id: 8, prescriptionId: 9, medicationName: 'Nasal spray',       notes: 'Two sprays each nostril daily', createdAt: '2026-04-01T10:00:00', updatedAt: '' },
          ],
        },
      ],
      2: [
        {
          id: 7, doctorId: 4, patientId: 2,
          diagnosis: 'Type 2 diabetes follow-up',
          treatments: [
            { id: 3, prescriptionId: 7, medicationName: 'Metformin 850mg',   notes: 'Twice daily with meals',       createdAt: '2026-03-15T09:00:00', updatedAt: '' },
            { id: 4, prescriptionId: 7, medicationName: 'Vitamin D3 1000IU', notes: 'Once daily with breakfast',    createdAt: '2026-03-15T09:00:00', updatedAt: '' },
          ],
        },
      ],
      3: [
        {
          id: 8, doctorId: 4, patientId: 3,
          diagnosis: 'Tension headache — chronic',
          treatments: [
            { id: 5, prescriptionId: 8, medicationName: 'Amitriptyline 25mg', notes: 'Once nightly, increase if needed', createdAt: '2026-03-20T14:00:00', updatedAt: '' },
            { id: 6, prescriptionId: 8, medicationName: 'Magnesium 400mg',    notes: 'Once daily with dinner',           createdAt: '2026-03-20T14:00:00', updatedAt: '' },
          ],
        },
      ],
      4: [
        {
          id: 10, doctorId: 4, patientId: 4,
          diagnosis: 'Hypertension — Stage 1',
          treatments: [
            { id: 9,  prescriptionId: 10, medicationName: 'Amlodipine 5mg',    notes: 'Once daily in the morning', createdAt: '2026-02-10T11:00:00', updatedAt: '' },
            { id: 10, prescriptionId: 10, medicationName: 'Lisinopril 10mg',   notes: 'Once daily with water',     createdAt: '2026-02-10T11:00:00', updatedAt: '' },
          ],
        },
      ],
      5: [
        {
          id: 11, doctorId: 4, patientId: 5,
          diagnosis: 'Iron deficiency anaemia',
          treatments: [
            { id: 11, prescriptionId: 11, medicationName: 'Ferrous sulphate 200mg', notes: 'Three times daily before meals', createdAt: '2026-04-10T09:30:00', updatedAt: '' },
            { id: 12, prescriptionId: 11, medicationName: 'Vitamin C 500mg',        notes: 'Take alongside iron tablet',     createdAt: '2026-04-10T09:30:00', updatedAt: '' },
          ],
        },
      ],
    };

    this.allPatients = mockPatients.map(p => ({
      patient:       p,
      prescriptions: mockPrescriptions[p.id] ?? [],
      expanded:      false,
      rxExpanded:    {},
      chatOpen:      false,
      uploadOpen:    false,
      chatMessages:  this.seedChatMessages(p.id),
      attachments:   this.seedAttachments(p.id),
    }));
  }

  /** Seed some demo chat messages per patient */
  private seedChatMessages(patientId: number): ChatMessage[] {
    if (patientId === 1) return [
      { id: 1, text: 'Good morning Doctor, I still have a slight headache.', sender: 'patient',  timestamp: new Date('2026-03-13T08:10:00'), type: 'message' },
      { id: 2, text: 'Continue with Paracetamol for 2 more days and rest well.', sender: 'doctor', timestamp: new Date('2026-03-13T08:45:00'), type: 'instruction' },
    ];
    if (patientId === 2) return [
      { id: 1, text: 'My blood sugar this morning was 140.', sender: 'patient', timestamp: new Date('2026-03-16T07:30:00'), type: 'message' },
    ];
    return [];
  }

  /** Seed some demo attachments per patient */
  private seedAttachments(patientId: number): Attachment[] {
    if (patientId === 1) return [
      { id: 1, name: 'CBC_Report_March2026.pdf', size: '240 KB', type: 'pdf', url: '#', date: new Date('2026-03-12') },
    ];
    if (patientId === 4) return [
      { id: 1, name: 'ECG_Feb2026.pdf',  size: '1.2 MB', type: 'pdf', url: '#', date: new Date('2026-02-10') },
      { id: 2, name: 'BP_chart.png',     size: '85 KB',  type: 'img', url: '#', date: new Date('2026-02-11') },
    ];
    return [];
  }

  // ── Search & Filter ───────────────────────────────────────────────────────

  applyFilters(): void {
    let result = [...this.allPatients];

    // 1. Name / email / phone search
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(pw =>
        pw.patient.name.toLowerCase().includes(q)  ||
        pw.patient.email.toLowerCase().includes(q) ||
        pw.patient.phone.includes(q)               ||
        pw.patient.city.toLowerCase().includes(q)
      );
    }

    // 2. Filter by notes / treatment name keyword
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

    // 3. Filter by diagnosis keyword
    const diag = this.filterDiagnosis.toLowerCase().trim();
    if (diag) {
      result = result.filter(pw =>
        pw.prescriptions.some(rx =>
          rx.diagnosis.toLowerCase().includes(diag)
        )
      );
    }

    // 4. Date filter — based on latest prescription date
    if (this.filterDate !== 'all') {
      const now   = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(pw => {
        const dates = pw.prescriptions.flatMap(rx =>
          rx.treatments.map(t => new Date(t.createdAt))
        ).filter(d => !isNaN(d.getTime()));

        if (!dates.length) return false;
        const latest = new Date(Math.max(...dates.map(d => d.getTime())));

        if (this.filterDate === 'today') {
          return latest.toDateString() === today.toDateString();
        }
        if (this.filterDate === 'week') {
          const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
          return latest >= weekAgo;
        }
        if (this.filterDate === 'month') {
          const monthAgo = new Date(today); monthAgo.setMonth(today.getMonth() - 1);
          return latest >= monthAgo;
        }
        return true;
      });
    }

    this.filteredPatients = result;
  }

  clearFilters(): void {
    this.searchQuery     = '';
    this.filterKeyword   = '';
    this.filterDiagnosis = '';
    this.filterDate      = 'all';
    this.applyFilters();
  }
  patientsWithRxCount(): number {
  return this.allPatients.filter(p => p.prescriptions.length > 0).length;
}

  // ── UI toggles ────────────────────────────────────────────────────────────

  toggleExpand(pw: PatientWithPrescriptions): void {
    pw.expanded = !pw.expanded;
  }

  toggleRx(pw: PatientWithPrescriptions, rxId: number): void {
    pw.rxExpanded[rxId] = !pw.rxExpanded[rxId];
  }

  openChat(pw: PatientWithPrescriptions): void {
    // Close other open chats first
    this.allPatients.forEach(p => {
      if (p.patient.id !== pw.patient.id) p.chatOpen = false;
    });
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

    const newMsg: ChatMessage = {
      id:        Date.now(),
      text:      val.text.trim(),
      sender:    'doctor',
      timestamp: new Date(),
      type:      val.type ?? 'message',
    };

    pw.chatMessages = [...pw.chatMessages, newMsg];
    this.messageForm.reset({ text: '', type: 'message' });

    // TODO: wire to API
    // this.doctorService.sendMessage(pw.patient.id, newMsg).subscribe();
  }

  // ── File upload ───────────────────────────────────────────────────────────

  onFileSelected(event: Event, pw: PatientWithPrescriptions): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files?.length) return;

    Array.from(files).forEach(file => {
      const att: Attachment = {
        id:   Date.now() + Math.random(),
        name: file.name,
        size: this.formatBytes(file.size),
        type: file.type.includes('image') ? 'img' : 'pdf',
        url:  URL.createObjectURL(file),
        date: new Date(),
      };
      pw.attachments = [...pw.attachments, att];

      // TODO: wire to API
      // const fd = new FormData(); fd.append('file', file);
      // this.doctorService.uploadAttachment(pw.patient.id, fd).subscribe();
    });

    // Reset input so same file can be re-uploaded
    (event.target as HTMLInputElement).value = '';
  }

  removeAttachment(pw: PatientWithPrescriptions, attId: number): void {
    pw.attachments = pw.attachments.filter(a => a.id !== attId);
    // TODO: this.doctorService.deleteAttachment(attId).subscribe();
  }

  // ── PDF download ──────────────────────────────────────────────────────────

  /**
   * Generates a printable HTML string of the patient's full prescription
   * history and opens it in a new tab for the browser's built-in print/save as PDF.
   * In production replace with a server-side PDF endpoint or jsPDF.
   */
  downloadPdf(pw: PatientWithPrescriptions): void {
    this.generatingPdf = true;
    this.pdfPatientId  = pw.patient.id;

    const p   = pw.patient;
    const rxs = pw.prescriptions;

    const rxHtml = rxs.map(rx => `
      <div style="margin:16px 0;padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8faff">
        <div style="font-weight:600;color:#1a3d7a;margin-bottom:6px">
          Rx #${rx.id} — <em style="color:#555;font-weight:400">${rx.diagnosis}</em>
        </div>
        ${rx.treatments.map(t => `
          <div style="margin:6px 0 6px 12px;padding:8px;background:#fff;border-radius:6px;border:1px solid #e2e8f0">
            <strong>${t.medicationName}</strong><br>
            <span style="color:#666;font-size:13px">${t.notes}</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Patient History — ${p.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #1a202c; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; color: #0B2447; border-bottom: 2px solid #0B2447; padding-bottom: 8px; }
    .meta { display: flex; gap: 32px; margin: 16px 0 24px; font-size: 14px; }
    .meta div { display: flex; flex-direction: column; gap: 3px; }
    .meta label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>Patient Prescription History</h1>
  <div class="meta">
    <div><label>Name</label><strong>${this.formatDisplayName(p.name)}</strong></div>
    <div><label>Gender</label><strong>${this.genderLabel(p.gender)}</strong></div>
    <div><label>DOB</label><strong>${p.dateOfBirth}</strong></div>
    <div><label>Phone</label><strong>${p.phone}</strong></div>
    <div><label>City</label><strong>${p.city}, ${p.country}</strong></div>
  </div>
  <h2 style="font-size:16px;color:#0B2447">Prescriptions (${rxs.length})</h2>
  ${rxHtml || '<p style="color:#888">No prescriptions recorded.</p>'}
  <p style="margin-top:32px;font-size:12px;color:#aaa">Generated ${new Date().toLocaleDateString()}</p>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 400);
    }

    setTimeout(() => {
      this.generatingPdf = false;
      this.pdfPatientId  = null;
    }, 1200);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getInitials(name: string): string {
    const clean = name.replace(/\d+/g, '').trim();
    const parts = clean.split(/(?=[A-Z])/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }

  formatDisplayName(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').trim();
  }

  genderLabel(g: number): string {
    return g === 1 ? 'Male' : g === 2 ? 'Female' : 'Other';
  }

  age(dob: string): number {
    const d = new Date(dob);
    const n = new Date();
    let age = n.getFullYear() - d.getFullYear();
    if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) age--;
    return age;
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return ''; }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  totalRxCount(): number {
    return this.allPatients.reduce((sum, pw) => sum + pw.prescriptions.length, 0);
  }

  activeFiltersCount(): number {
    return [
      this.searchQuery.trim(),
      this.filterKeyword.trim(),
      this.filterDiagnosis.trim(),
      this.filterDate !== 'all' ? '1' : '',
    ].filter(Boolean).length;
  }
}