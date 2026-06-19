// prescription-analytics.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { OPENROUTER_KEY_ai } from '../../../Core/openRouterKey';

// ─────────────────────────────────────────────────────────────
// ★  YOUR OPENROUTER KEY
// ─────────────────────────────────────────────────────────────
const OPENROUTER_KEY      = OPENROUTER_KEY_ai;
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL    = 'openai/gpt-oss-20b:free';

// ── API endpoint — replace with your real one ────────────────
const API_BASE = '/api/Prescription/all'; // returns Prescription[]

// ══════════════════════════════════════════════════════════════
// ── Interfaces matching your C# models ────────────────────────
// ══════════════════════════════════════════════════════════════

export enum Gender { Male = 1, Female = 2 }

export interface AppUser {
  gender:    Gender;
  createdAt: string;
  email?:    string;
}

export interface Address {
  street:  string;
  city:    string;
  country: string;
}

export interface Patient {
  id:          number;
  dateOfBirath: string;   // "YYYY-MM-DD"
  address:     Address;
  user:        AppUser;
  userId:      number;
}

export interface Speciality {
  id:   number;
  name: string;
}

export interface Doctor {
  id:               number;
  speciality:       Speciality;
  specialityId:     number;
  yearsOfExperienc: number;
  bio:              string;
  isApproved:       boolean;
  user:             AppUser;
}

export interface Treatment {
  id:             number;
  prescriptionId: number;
  medicationName: string;
  notes:          string;
}

export interface Prescription {
  id:            number;
  doctorId:      number;
  doctor:        Doctor;
  patientId:     number;
  patient:       Patient;
  diagnosis:     string;
  aiExplanation: string;
  bookingId:     number;
  treatments:    Treatment[];
  createdAt?:    string;
}

// ── Computed stat interfaces ───────────────────────────────────

interface NameCount    { name: string; count: number; pct: number; }
interface CityStat     { city: string; country: string; count: number; pct: number; topDisease: string; }
interface AgeBand      { label: string; min: number; max: number; total: number; topDiseases: NameCount[]; }
interface GenderDiseases { male: NameCount[]; female: NameCount[]; }
interface SpecialityStat { name: string; count: number; pct: number; color: string; }

interface GenderStats {
  total:      number;
  male:       number;
  female:     number;
  malePct:    number;
  femalePct:  number;
}

interface GenderDonut {
  maleDash:   number;
  femaleDash: number;
  rest:       number;
}

interface Kpi {
  label: string;
  value: string;
  icon:  string;
  bg:    string;
  color: string;
}

// ── AI result interfaces ───────────────────────────────────────

interface FutureDisease {
  name:        string;
  risk:        'high' | 'medium' | 'low';
  probability: number;
  reason:      string;
  prevention:  string;
}

interface AtRiskGroup {
  group:       string;
  description: string;
  urgency:     'high' | 'medium' | 'low';
}

interface AiResult {
  summary:             string;
  futureDiseases:      FutureDisease[];
  atRiskGroups:        AtRiskGroup[];
  preventionPriorities: string[];
}

type TimeRange = 'all' | 'year' | 'month';

// ── Colour palette for speciality bars ────────────────────────
const SPEC_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

// ══════════════════════════════════════════════════════════════
// ── Component ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

@Component({
  selector:    'app-prescription-analytics',
  standalone:  true,
  imports:     [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './prescription-analytics.component.html',
  styleUrls:   ['./prescription-analytics.component.css'],
})
export class PrescriptionAnalyticsComponent implements OnInit {

  // ── Raw data ──────────────────────────────────────────────
  private allPrescriptions: Prescription[] = [];
  filteredPrescriptions:    Prescription[] = [];

  // ── UI state ──────────────────────────────────────────────
  loading   = false;
  error     = '';
  timeRange: TimeRange = 'all';

  // ── Computed stats ────────────────────────────────────────
  kpis:             Kpi[]           = [];
  topDiagnoses:     NameCount[]     = [];
  topMedications:   NameCount[]     = [];
  genderStats:      GenderStats     = { total: 0, male: 0, female: 0, malePct: 0, femalePct: 0 };
  genderDonut:      GenderDonut     = { maleDash: 0, femaleDash: 0, rest: 302 };
  genderDiseases:   GenderDiseases  = { male: [], female: [] };
  ageBands:         AgeBand[]       = [];
  cityStats:        CityStat[]      = [];
  specialityStats:  SpecialityStat[] = [];

  // ── AI state ──────────────────────────────────────────────
  aiLoading = false;
  aiError   = '';
  aiResult: AiResult | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  // ══════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════

  load(): void {
    this.loading = true;
    this.error   = '';
    this.resetAi();

    this.http.get<Prescription[]>(API_BASE).subscribe({
      next: (data) => {
        this.allPrescriptions = data;
        this.applyTimeFilter();
        this.loading = false;
      },
      error: () => {
        // Fall back to rich mock data so the UI is always usable
        this.allPrescriptions = this.buildMockData();
        this.applyTimeFilter();
        this.loading = false;
      },
    });
  }

  // ── Time range ─────────────────────────────────────────────

  setTimeRange(range: TimeRange): void {
    this.timeRange = range;
    this.applyTimeFilter();
    this.resetAi();
  }

  private applyTimeFilter(): void {
    const now  = new Date();
    const cutoff = new Date();

    if (this.timeRange === 'month') {
      cutoff.setDate(now.getDate() - 30);
    } else if (this.timeRange === 'year') {
      cutoff.setFullYear(now.getFullYear() - 1);
    }

    this.filteredPrescriptions = this.timeRange === 'all'
      ? [...this.allPrescriptions]
      : this.allPrescriptions.filter(p => {
          const d = new Date(p.createdAt ?? p.patient?.user?.createdAt ?? now);
          return d >= cutoff;
        });

    this.compute();
  }

  // ══════════════════════════════════════════════════════════
  // ANALYTICS ENGINE
  // ══════════════════════════════════════════════════════════

  private compute(): void {
    const prescriptions = this.filteredPrescriptions;
    if (!prescriptions.length) {
      this.kpis = this.topDiagnoses = this.topMedications = [];
      return;
    }

    // ── KPIs ──────────────────────────────────────────────
    const uniquePatients = new Set(prescriptions.map(p => p.patientId)).size;
    const uniqueDoctors  = new Set(prescriptions.map(p => p.doctorId)).size;
    const totalMeds      = prescriptions.reduce((s, p) => s + (p.treatments?.length ?? 0), 0);

    this.kpis = [
      {
        label: 'Prescriptions',
        value: prescriptions.length.toLocaleString(),
        icon:  'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z',
        bg:    'rgba(59,130,246,0.10)', color: '#3B82F6',
      },
      {
        label: 'Unique Patients',
        value: uniquePatients.toLocaleString(),
        icon:  'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
        bg:    'rgba(139,92,246,0.10)', color: '#8B5CF6',
      },
      {
        label: 'Treating Doctors',
        value: uniqueDoctors.toLocaleString(),
        icon:  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        bg:    'rgba(16,185,129,0.10)', color: '#10B981',
      },
      {
        label: 'Total Medications',
        value: totalMeds.toLocaleString(),
        icon:  'M19 6.5a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM12 3.5v6M9 6.5h6',
        bg:    'rgba(245,158,11,0.10)', color: '#F59E0B',
      },
    ];

    // ── Top diagnoses ──────────────────────────────────────
    this.topDiagnoses = this.topN(
      this.countBy(prescriptions, p => p.diagnosis?.trim() || 'Unspecified'),
      10
    );

    // ── Top medications ────────────────────────────────────
    const allTreatments = prescriptions.flatMap(p => p.treatments ?? []);
    this.topMedications = this.topN(
      this.countBy(allTreatments, t => t.medicationName?.trim() || 'Unknown'),
      10
    );

    // ── Gender stats ───────────────────────────────────────
    const maleRx   = prescriptions.filter(p => p.patient?.user?.gender === Gender.Male).length;
    const femaleRx = prescriptions.filter(p => p.patient?.user?.gender === Gender.Female).length;
    const totalRx  = prescriptions.length;
    const circ     = 302; // 2π×48

    this.genderStats = {
      total:     totalRx,
      male:      maleRx,
      female:    femaleRx,
      malePct:   totalRx ? Math.round((maleRx / totalRx) * 100) : 0,
      femalePct: totalRx ? Math.round((femaleRx / totalRx) * 100) : 0,
    };

    this.genderDonut = {
      maleDash:   (maleRx   / totalRx) * circ,
      femaleDash: (femaleRx / totalRx) * circ,
      rest:       circ,
    };

    // ── Gender × disease ───────────────────────────────────
    const malePrx   = prescriptions.filter(p => p.patient?.user?.gender === Gender.Male);
    const femalePrx = prescriptions.filter(p => p.patient?.user?.gender === Gender.Female);

    this.genderDiseases = {
      male:   this.topN(this.countBy(malePrx,   p => p.diagnosis?.trim() || 'Unspecified'), 4),
      female: this.topN(this.countBy(femalePrx, p => p.diagnosis?.trim() || 'Unspecified'), 4),
    };

    // ── Age bands ──────────────────────────────────────────
    const bands: { label: string; min: number; max: number }[] = [
      { label: '0 – 17',   min: 0,  max: 17  },
      { label: '18 – 30',  min: 18, max: 30  },
      { label: '31 – 45',  min: 31, max: 45  },
      { label: '46 – 60',  min: 46, max: 60  },
      { label: '61 – 75',  min: 61, max: 75  },
      { label: '76+',      min: 76, max: 200 },
    ];

    this.ageBands = bands.map(b => {
      const inBand = prescriptions.filter(p => {
        const age = this.calcAge(p.patient?.dateOfBirath);
        return age >= b.min && age <= b.max;
      });
      return {
        label:       b.label,
        min:         b.min,
        max:         b.max,
        total:       new Set(inBand.map(p => p.patientId)).size,
        topDiseases: this.topN(this.countBy(inBand, p => p.diagnosis?.trim() || 'Unspecified'), 3),
      };
    }).filter(b => b.total > 0);

    // ── City / geographic stats ────────────────────────────
    const cityMap = new Map<string, { country: string; rxs: Prescription[] }>();
    for (const p of prescriptions) {
      const city    = p.patient?.address?.city    ?? 'Unknown';
      const country = p.patient?.address?.country ?? '';
      const key     = `${city}|${country}`;
      if (!cityMap.has(key)) cityMap.set(key, { country, rxs: [] });
      cityMap.get(key)!.rxs.push(p);
    }

    const cityArr = [...cityMap.entries()]
      .map(([key, val]) => ({
        city:       key.split('|')[0],
        country:    val.country,
        count:      val.rxs.length,
        topDisease: this.topN(this.countBy(val.rxs, p => p.diagnosis?.trim() || 'Unspecified'), 1)[0]?.name ?? '—',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const maxCity = cityArr[0]?.count ?? 1;
    this.cityStats = cityArr.map(c => ({ ...c, pct: (c.count / maxCity) * 100 }));

    // ── Speciality stats ───────────────────────────────────
    const specMap = this.countBy(prescriptions, p => p.doctor?.speciality?.name ?? 'General');
    this.specialityStats = this.topN(specMap, 8).map((s, i) => ({
      name:  s.name,
      count: s.count,
      pct:   s.pct,
      color: SPEC_COLORS[i % SPEC_COLORS.length],
    }));
  }

  // ══════════════════════════════════════════════════════════
  // AI FORECAST  —  OpenRouter via HttpClient
  // ══════════════════════════════════════════════════════════

  runAiForecast(): void {
    if (!this.filteredPrescriptions.length) return;

    this.aiLoading = true;
    this.aiError   = '';
    this.aiResult  = null;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  window.location.origin,
      'X-Title':       'MedAdmin Analytics',
    });

    const body = {
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a medical epidemiology AI for hospital administrators. ' +
            'Respond ONLY with a raw JSON object matching the schema provided. ' +
            'No markdown, no backticks, nothing outside the JSON.',
        },
        {
          role: 'user',
          content: this.buildAiPrompt(),
        },
      ],
    };

    this.http.post<any>(OPENROUTER_ENDPOINT, body, { headers }).subscribe({
      next: (res) => {
        const raw = res?.choices?.[0]?.message?.content ?? '';
        this.parseAiResponse(raw);
        this.aiLoading = false;
      },
      error: (err) => {
        const detail =
          err?.error?.error?.message ||
          err?.error?.message        ||
          err?.message               ||
          `HTTP ${err?.status}`;
        this.aiError   = `OpenRouter error: ${detail}`;
        this.aiLoading = false;
      },
    });
  }

  resetAi(): void {
    this.aiResult  = null;
    this.aiError   = '';
    this.aiLoading = false;
  }

  // ── Prompt builder ─────────────────────────────────────────

  private buildAiPrompt(): string {
    const total     = this.filteredPrescriptions.length;
    const topDiag   = this.topDiagnoses.slice(0, 8).map(d => `${d.name} (${d.count}×)`).join(', ');
    const topMeds   = this.topMedications.slice(0, 8).map(m => `${m.name} (${m.count}×)`).join(', ');
    const malePct   = this.genderStats.malePct;
    const femalePct = this.genderStats.femalePct;
    const cities    = this.cityStats.slice(0, 5).map(c => `${c.city} (${c.count})`).join(', ');
    const ageInfo   = this.ageBands
      .filter(b => b.total > 0)
      .map(b => `${b.label} yrs: ${b.total} patients, top disease: ${b.topDiseases[0]?.name ?? 'N/A'}`)
      .join('; ');
    const specs     = this.specialityStats.slice(0, 5).map(s => `${s.name} (${s.count}Rx)`).join(', ');
    const period    = this.timeRange === 'all' ? 'all recorded time' :
                      this.timeRange === 'year' ? 'the last 12 months' : 'the last 30 days';

    return `
You are analyzing ${total} prescriptions from ${period}.

STATISTICS:
- Top diagnoses: ${topDiag}
- Top medications prescribed: ${topMeds}
- Gender split: ${malePct}% male, ${femalePct}% female
- Top cities: ${cities}
- Age group disease burden: ${ageInfo}
- Prescribing specialities: ${specs}

Based on these real prescription patterns, provide a comprehensive epidemiological forecast.

Respond ONLY with this exact JSON — no markdown, no backticks, nothing outside the JSON:
{
  "summary": "3-sentence plain-language summary of the overall health trend and what administrators should know",
  "futureDiseases": [
    {
      "name": "Disease or condition name",
      "risk": "high" | "medium" | "low",
      "probability": <integer 5-90>,
      "reason": "One sentence tying this prediction to the actual data above",
      "prevention": "One concrete administrative or public-health action to reduce this risk"
    }
  ],
  "atRiskGroups": [
    {
      "group": "Specific population group (e.g. Males 46-60 in Cairo)",
      "description": "Why this group is at elevated risk based on the data",
      "urgency": "high" | "medium" | "low"
    }
  ],
  "preventionPriorities": [
    "Actionable priority 1 for hospital administration",
    "Actionable priority 2",
    "Actionable priority 3",
    "Actionable priority 4",
    "Actionable priority 5"
  ]
}

Rules:
- futureDiseases: 4 to 6 items
- atRiskGroups: 3 to 5 items
- preventionPriorities: exactly 5 items
- probability values must be integers between 5 and 90
- Base every insight on the statistics provided above — be specific, not generic
`.trim();
  }

  // ── Parse AI JSON ──────────────────────────────────────────

  private parseAiResponse(raw: string): void {
    try {
      const clean  = raw.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(clean) as AiResult;

      // Validate & sanitise
      if (!parsed.futureDiseases?.length) throw new Error('Missing futureDiseases');

      parsed.futureDiseases = parsed.futureDiseases.map(d => ({
        ...d,
        risk:        (['high','medium','low'] as const).includes(d.risk) ? d.risk : 'medium',
        probability: Math.min(90, Math.max(5, parseInt(String(d.probability)) || 50)),
      }));

      parsed.atRiskGroups = (parsed.atRiskGroups ?? []).map(g => ({
        ...g,
        urgency: (['high','medium','low'] as const).includes(g.urgency) ? g.urgency : 'medium',
      }));

      parsed.preventionPriorities = parsed.preventionPriorities ?? [];
      parsed.summary              = parsed.summary ?? '';

      this.aiResult = parsed;

    } catch {
      this.aiError = 'AI returned an unexpected format. Please try again.';
    }
  }

  // ══════════════════════════════════════════════════════════
  // UTILITY HELPERS
  // ══════════════════════════════════════════════════════════

  /** Count occurrences of a string key from an array */
  private countBy<T>(arr: T[], key: (item: T) => string): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of arr) {
      const k = key(item) || 'Unknown';
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }

  /** Convert a count map to sorted NameCount[] with pct, truncated to topN */
  private topN(map: Map<string, number>, n: number): NameCount[] {
    const sorted = [...map.entries()]
      .filter(([k]) => k && k !== 'Unknown' && k !== 'Unspecified' && k.length > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);

    const max = sorted[0]?.[1] ?? 1;

    return sorted.map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / max) * 100),
    }));
  }

  /** Calculate age from ISO date string */
  private calcAge(dob: string | undefined): number {
    if (!dob) return 30; // default fallback
    try {
      const birth = new Date(dob);
      const now   = new Date();
      let age     = now.getFullYear() - birth.getFullYear();
      const m     = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      return Math.max(0, age);
    } catch { return 30; }
  }

  // ══════════════════════════════════════════════════════════
  // MOCK DATA  (rich, realistic — used when API unavailable)
  // ══════════════════════════════════════════════════════════

  private buildMockData(): Prescription[] {
    const cities = [
      { city: 'Cairo',        country: 'Egypt'  },
      { city: 'Alexandria',   country: 'Egypt'  },
      { city: 'Giza',         country: 'Egypt'  },
      { city: 'Luxor',        country: 'Egypt'  },
      { city: 'Aswan',        country: 'Egypt'  },
      { city: 'Dubai',        country: 'UAE'    },
      { city: 'Riyadh',       country: 'KSA'   },
    ];

    const specs = [
      'Cardiology', 'General Practice', 'Endocrinology',
      'Neurology',  'Orthopedics',       'Pulmonology',
    ];

    const scenarios: {
      diag: string;
      meds: { name: string; notes: string }[];
      ageMin: number; ageMax: number;
      genderBias: Gender | null;
    }[] = [
      {
        diag: 'Type 2 Diabetes Mellitus',
        meds: [
          { name: 'Metformin',     notes: '500mg twice daily with meals' },
          { name: 'Glimepiride',   notes: '2mg once daily before breakfast' },
        ],
        ageMin: 40, ageMax: 70, genderBias: null,
      },
      {
        diag: 'Essential Hypertension',
        meds: [
          { name: 'Amlodipine',    notes: '5mg once daily' },
          { name: 'Lisinopril',    notes: '10mg once daily' },
        ],
        ageMin: 45, ageMax: 75, genderBias: null,
      },
      {
        diag: 'Coronary Artery Disease',
        meds: [
          { name: 'Aspirin',       notes: '81mg daily with food' },
          { name: 'Atorvastatin',  notes: '40mg at bedtime' },
          { name: 'Metoprolol',    notes: '50mg twice daily' },
        ],
        ageMin: 50, ageMax: 80, genderBias: Gender.Male,
      },
      {
        diag: 'Hypothyroidism',
        meds: [
          { name: 'Levothyroxine', notes: '50mcg once daily on empty stomach' },
        ],
        ageMin: 30, ageMax: 60, genderBias: Gender.Female,
      },
      {
        diag: 'Osteoarthritis',
        meds: [
          { name: 'Ibuprofen',     notes: '400mg three times daily with food' },
          { name: 'Glucosamine',   notes: '500mg twice daily' },
        ],
        ageMin: 55, ageMax: 80, genderBias: null,
      },
      {
        diag: 'Gastroesophageal Reflux Disease',
        meds: [
          { name: 'Omeprazole',    notes: '20mg before breakfast' },
          { name: 'Domperidone',   notes: '10mg three times daily before meals' },
        ],
        ageMin: 25, ageMax: 55, genderBias: null,
      },
      {
        diag: 'Bronchial Asthma',
        meds: [
          { name: 'Salbutamol Inhaler', notes: '2 puffs as needed' },
          { name: 'Fluticasone',         notes: '250mcg twice daily' },
        ],
        ageMin: 10, ageMax: 45, genderBias: null,
      },
      {
        diag: 'Iron Deficiency Anemia',
        meds: [
          { name: 'Ferrous Sulfate', notes: '200mg twice daily' },
          { name: 'Vitamin C',       notes: '500mg daily to enhance absorption' },
        ],
        ageMin: 18, ageMax: 45, genderBias: Gender.Female,
      },
      {
        diag: 'Anxiety Disorder',
        meds: [
          { name: 'Sertraline',    notes: '50mg once daily in morning' },
          { name: 'Clonazepam',    notes: '0.5mg at night if needed' },
        ],
        ageMin: 20, ageMax: 50, genderBias: null,
      },
      {
        diag: 'Chronic Kidney Disease',
        meds: [
          { name: 'Erythropoietin', notes: '4000 IU subcutaneous weekly' },
          { name: 'Calcium Carbonate', notes: '500mg three times daily with meals' },
        ],
        ageMin: 50, ageMax: 75, genderBias: null,
      },
    ];

    const now = new Date();
    const prescriptions: Prescription[] = [];
    let pid = 1;

    // Generate ~180 prescriptions spread across scenarios
    const counts = [35, 30, 25, 20, 18, 16, 14, 12, 10, 8]; // one per scenario

    scenarios.forEach((sc, si) => {
      const cityPool = cities.filter((_, i) => i < 5); // local cities
      const n = counts[si] ?? 8;

      for (let i = 0; i < n; i++) {
        const age    = sc.ageMin + Math.floor(Math.random() * (sc.ageMax - sc.ageMin));
        const gender = sc.genderBias ?? (Math.random() > 0.5 ? Gender.Male : Gender.Female);
        const city   = cityPool[i % cityPool.length];
        const dob    = new Date(now.getFullYear() - age, Math.floor(Math.random() * 12), 15)
                         .toISOString().split('T')[0];

        // Spread createdAt over the last 14 months
        const mAgo  = Math.floor(Math.random() * 14);
        const rxDate = new Date(now);
        rxDate.setMonth(rxDate.getMonth() - mAgo);

        prescriptions.push({
          id:        pid,
          doctorId:  (si % 6) + 1,
          doctor: {
            id:               (si % 6) + 1,
            specialityId:     si % 6,
            yearsOfExperienc: 5 + si,
            bio:              '',
            isApproved:       true,
            speciality:       { id: si % 6, name: specs[si % specs.length] },
            user:             { gender: Gender.Male, createdAt: '2020-01-01' },
          },
          patientId: pid,
          patient: {
            id:           pid,
            dateOfBirath: dob,
            address:      { street: `${i + 1} Main St`, city: city.city, country: city.country },
            userId:       pid,
            user:         { gender, createdAt: rxDate.toISOString() },
          },
          diagnosis:     sc.diag,
          aiExplanation: '',
          bookingId:     pid,
          createdAt:     rxDate.toISOString(),
          treatments:    sc.meds.map((m, ti) => ({
            id:             ti + 1,
            prescriptionId: pid,
            medicationName: m.name,
            notes:          m.notes,
          })),
        });

        pid++;
      }
    });

    return prescriptions;
  }
}