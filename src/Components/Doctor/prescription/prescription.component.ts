import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, FormArray, Validators
} from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { OPENROUTER_KEY_ai } from '../../../Core/openRouterKey';


const OPENROUTER_KEY = OPENROUTER_KEY_ai;

type ActiveTab = 'create' | 'all' | 'find';

interface Treatment {
  medicationName: string;
  notes: string;
}

interface Prescription {
  id?: number;
  doctorId: number;
  patientId: number;
  createdAt?: string;
  treatments: Treatment[];
}

interface Disease {
  name: string;
  risk: 'high' | 'medium' | 'low';
  probability: number;   // 0–100
  reason: string;
  prevention: string;
}

@Component({
  selector: 'app-prescription',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './prescription.component.html',
  styleUrl: './prescription.component.css'
})
export class PrescriptionComponent implements OnInit {

  activeTab: ActiveTab = 'create';

  // ── Create ──────────────────────────────────────────────────────────────────
  prescriptionForm!: FormGroup;
  createLoading = false;
  createSuccess = false;
  createError   = '';

  // ── All ─────────────────────────────────────────────────────────────────────
  allPrescriptions: Prescription[] = [];
  allLoading = false;
  allError   = '';

  // ── Find ────────────────────────────────────────────────────────────────────
  searchId = '';
  foundPrescription: Prescription | null = null;
  findLoading = false;
  findError   = '';

  // ── AI Prediction ────────────────────────────────────────────────────────────
  showAiPanel = false;
  aiLoading   = false;
  aiError     = '';
  predictions: Disease[] = [];
  aiSummary   = '';

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initForm();
  }

  // ── Tab ──────────────────────────────────────────────────────────────────────

  setTab(tab: ActiveTab) {
    this.activeTab = tab;
    if (tab === 'all') this.loadAllPrescriptions();
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  initForm() {
    this.prescriptionForm = this.fb.group({
      doctorId:   [6, [Validators.required, Validators.min(1)]],
      patientId:  [1, [Validators.required, Validators.min(1)]],
      treatments: this.fb.array([this.createTreatmentGroup()])
    });
  }

  createTreatmentGroup(): FormGroup {
    return this.fb.group({
      medicationName: ['', Validators.required],
      notes:          ['', Validators.required]
    });
  }

  get treatments(): FormArray {
    return this.prescriptionForm.get('treatments') as FormArray;
  }

  addTreatment()            { this.treatments.push(this.createTreatmentGroup()); }
  removeTreatment(i: number){ if (this.treatments.length > 1) this.treatments.removeAt(i); }
  trackByIndex(i: number)   { return i; }

  // ── Submit Prescription ───────────────────────────────────────────────────────

  submitPrescription() {
    if (this.prescriptionForm.invalid) return;
    this.createLoading = true;
    this.createError   = '';
    this.createSuccess = false;

    // Replace with: this.http.post('/api/prescriptions', payload).subscribe(...)
    setTimeout(() => {
      this.createLoading = false;
      this.createSuccess = true;
      this.prescriptionForm.reset({ doctorId: 6, patientId: 1 });
      this.treatments.clear();
      this.treatments.push(this.createTreatmentGroup());
    }, 1000);
  }

  // ── Load All Prescriptions ────────────────────────────────────────────────────

  loadAllPrescriptions() {
    this.allLoading = true;
    this.allError   = '';

    // Replace with: this.http.get<Prescription[]>('/api/prescriptions').subscribe(...)
    setTimeout(() => {
      this.allPrescriptions = this.mockPrescriptions();
      this.allLoading = false;
    }, 700);
  }

  // ── Find by ID ────────────────────────────────────────────────────────────────

  findPrescription() {
    if (!this.searchId) return;
    this.findLoading       = true;
    this.findError         = '';
    this.foundPrescription = null;

    // Replace with: this.http.get<Prescription>(`/api/prescriptions/${this.searchId}`).subscribe(...)
    setTimeout(() => {
      const found = this.mockPrescriptions().find(p => p.id === Number(this.searchId));
      this.findLoading = false;
      if (found) {
        this.foundPrescription = found;
      } else {
        this.findError = `No prescription found with ID ${this.searchId}.`;
      }
    }, 600);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ★  AI DISEASE PREDICTION  —  called by "Predict Future Diseases" button
  // ────────────────────────────────────────────────────────────────────────────

  async predictDiseases(): Promise<void> {
    if (this.allPrescriptions.length === 0) return;

    this.showAiPanel = true;
    this.aiLoading   = true;
    this.aiError     = '';
    this.predictions = [];
    this.aiSummary   = '';

    const prompt = this.buildPrompt();

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type':  'application/json',
          'HTTP-Referer':  window.location.origin,
          'X-Title':       'MedScript',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            {
              role: 'system',
              content:
                'You are a clinical AI. Respond ONLY with a raw JSON object. ' +
                'No markdown, no backticks, no explanation text outside the JSON.'
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${body}`);
      }

      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content ?? '';
      this.parseAndApply(raw);

    } catch (err: any) {
      this.aiError = err?.message ?? 'Failed to reach OpenRouter. Check your API key.';
    } finally {
      this.aiLoading = false;
    }
  }

  closeAiPanel() {
    this.showAiPanel = false;
    this.predictions = [];
    this.aiSummary   = '';
    this.aiError     = '';
  }

  // ── Prompt ────────────────────────────────────────────────────────────────────

  private buildPrompt(): string {
    const lines = this.allPrescriptions.flatMap(p =>
      p.treatments.map(t => `• ${t.medicationName} — ${t.notes}`)
    );

    return `
The patient has received the following medications across ${this.allPrescriptions.length} prescriptions:

${lines.join('\n')}

Based on these medications, identify 3 to 5 diseases or health conditions this patient is likely to develop in the future.

Respond ONLY with this exact JSON structure (no markdown, no explanation):
{
  "summary": "2-sentence overall health outlook",
  "diseases": [
    {
      "name": "Disease name",
      "risk": "high" | "medium" | "low",
      "probability": <integer 5-85>,
      "reason": "One sentence explaining why this medication history suggests this disease",
      "prevention": "One concrete preventive action the patient can take"
    }
  ]
}
`.trim();
  }

  // ── Parse JSON from AI ────────────────────────────────────────────────────────

  private parseAndApply(raw: string): void {
    try {
      const clean   = raw.replace(/```json|```/gi, '').trim();
      const parsed  = JSON.parse(clean);

      this.aiSummary   = parsed.summary ?? '';
      this.predictions = (parsed.diseases ?? []).map((d: any) => ({
        name:        d.name        ?? 'Unknown',
        risk:        ['high','medium','low'].includes(d.risk) ? d.risk : 'medium',
        probability: Math.min(100, Math.max(0, parseInt(d.probability) || 50)),
        reason:      d.reason      ?? '',
        prevention:  d.prevention  ?? '',
      }));

      if (this.predictions.length === 0) throw new Error('Empty diseases array');

    } catch {
      this.aiError = 'AI returned an unexpected format. Please try again.';
    }
  }

  // ── Template Helper ───────────────────────────────────────────────────────────

  getTotalMeds(): number {
    return this.allPrescriptions.reduce((s, p) => s + p.treatments.length, 0);
  }

  // ── Mock Data ─────────────────────────────────────────────────────────────────

  private mockPrescriptions(): Prescription[] {
    return [
      {
        id: 1, doctorId: 6, patientId: 1, createdAt: '2025-10-01',
        treatments: [
          { medicationName: 'Metformin',    notes: '500mg twice daily with meals' },
          { medicationName: 'Atorvastatin', notes: '20mg once daily at bedtime' },
        ]
      },
      {
        id: 2, doctorId: 6, patientId: 1, createdAt: '2025-11-15',
        treatments: [
          { medicationName: 'Lisinopril', notes: '10mg once daily' },
          { medicationName: 'Aspirin',    notes: '81mg daily' },
        ]
      },
      {
        id: 3, doctorId: 6, patientId: 1, createdAt: '2026-01-20',
        treatments: [
          { medicationName: 'Metformin',  notes: '1000mg twice daily' },
          { medicationName: 'Amlodipine', notes: '5mg once daily' },
          { medicationName: 'Omeprazole', notes: '20mg before breakfast' },
        ]
      },
    ];
  }
}