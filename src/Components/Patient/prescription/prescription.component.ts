// prescription.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorService } from '../../../Core/doctor.service';
import { AuthService } from '../../../Core/auth.service';
import { PatientService } from '../../../Core/patient.service';

// ─────────────────────────────────────────────────────────────
// ★  PUT YOUR OPENROUTER KEY HERE
// ─────────────────────────────────────────────────────────────
const OPENROUTER_KEY = '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';

// ── Interfaces — matching real API response exactly ───────────

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
  diagnosis:     string;
  aiExplanation: string;
}

// AI prediction result shape
interface Disease {
  name:        string;
  risk:        'high' | 'medium' | 'low';
  probability: number;   // 0–100
  reason:      string;
  prevention:  string;
}

// ── Component ─────────────────────────────────────────────────

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

  // ── Search / filter ────────────────────────────────────────

  searchTerm   = signal('');
  filterDoctor = signal('');

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
        (p.doctor?.name       ?? '').toLowerCase().includes(doc) ||
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

  // ── AI Prediction state ────────────────────────────────────

  showAiPanel = false;
  aiLoading   = false;
  aiError     = '';
  predictions: Disease[] = [];
  aiSummary   = '';

  // ── Constructor ────────────────────────────────────────────

  constructor(
    private doctorSvc:      DoctorService,
    private router:         Router,
    private authService:    AuthService,
    private patientService: PatientService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────

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

  // ── Data ───────────────────────────────────────────────────

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.doctorSvc.getPatientPrescriptions(this.patientId).subscribe({
      next: (data: any[]) => {
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

  // ── UI helpers ─────────────────────────────────────────────

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
    const clean = name.replace(/[._-]/g, ' ');
    return clean.trim().split(/[\s]+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  formatDisplayName(name: string | null | undefined): string {
    if (!name) return 'Unknown Doctor';
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

  // ════════════════════════════════════════════════════════════
  // ★  AI DISEASE PREDICTION — OpenRouter
  // ════════════════════════════════════════════════════════════

  async predictDiseases(): Promise<void> {
    if (this.prescriptions().length === 0) return;

    this.showAiPanel = true;
    this.aiLoading   = true;
    this.aiError     = '';
    this.predictions = [];
    this.aiSummary   = '';

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin,
    'X-Title': 'MedScript',
  },
  body: JSON.stringify({
    model: 'meta-llama/llama-3.1-8b-instruct',
    messages: [
      {
        role: 'system',
        content:
          'You are a clinical AI assistant. Respond ONLY with a raw JSON object — no markdown, no backticks, no extra text.',
      },
      {
        role: 'user',
        content: this.buildPrompt(),
      },
    ],
  }),
});

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${body}`);
      }

      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content ?? '';
      this.parseResponse(raw);

    } catch (err: any) {
      this.aiError = err?.message ?? 'Failed to connect to OpenRouter. Check your API key.';
    } finally {
      this.aiLoading = false;
    }
  }

  closeAiPanel(): void {
    this.showAiPanel = false;
    this.predictions = [];
    this.aiSummary   = '';
    this.aiError     = '';
  }

  // ── Build prompt from all prescriptions ───────────────────

  private buildPrompt(): string {
    const lines: string[] = [];

    this.prescriptions().forEach((p, idx) => {
      lines.push(`Prescription ${idx + 1} (Doctor: ${p.doctor?.name ?? 'unknown'}, Speciality: ${p.doctor?.speciality ?? 'unknown'}):`);
      p.treatments.forEach(t => {
        lines.push(`  • ${t.medicationName} — ${t.notes}`);
      });
      if (p.diagnosis) {
        lines.push(`  Diagnosis: ${p.diagnosis}`);
      }
    });

    return `
The patient has the following prescription history across ${this.prescriptions().length} prescription(s):

${lines.join('\n')}

Based on this medication and diagnosis history, identify 3 to 5 diseases or health conditions this patient is likely to develop in the future.

Respond ONLY with this exact JSON structure — no markdown, no backticks, nothing outside the JSON:
{
  "summary": "2-sentence plain-language summary of the patient overall health outlook",
  "diseases": [
    {
      "name": "Disease name",
      "risk": "high" | "medium" | "low",
      "probability": <integer between 5 and 85>,
      "reason": "One sentence explaining why the medication history suggests this condition",
      "prevention": "One concrete action the patient can take to reduce this risk"
    }
  ]
}
`.trim();
  }

  // ── Parse AI JSON response ────────────────────────────────

  private parseResponse(raw: string): void {
    try {
      const clean  = raw.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(clean);

      this.aiSummary = parsed.summary ?? '';

      this.predictions = (parsed.diseases ?? []).map((d: any) => ({
        name:        String(d.name        ?? 'Unknown condition'),
        risk:        ['high', 'medium', 'low'].includes(d.risk) ? d.risk : 'medium',
        probability: Math.min(100, Math.max(0, parseInt(d.probability) || 50)),
        reason:      String(d.reason      ?? ''),
        prevention:  String(d.prevention  ?? ''),
      }));

      if (this.predictions.length === 0) {
        throw new Error('No diseases returned');
      }

    } catch {
      this.aiError     = 'AI returned an unexpected format. Please try again.';
      this.predictions = [];
      this.aiSummary   = '';
    }
  }
}