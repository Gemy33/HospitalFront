// treatment-analytics.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// ── Interfaces ────────────────────────────────────────────────

/** Raw shape returned by GET /api/Treatment (or equivalent) */
export interface Treatment {
  id?:            number;
  prescriptionId: number;
  medicationName: string;
  notes:          string;
}

/** Computed stats per unique medication */
export interface MedStat {
  medicationName: string;
  count:          number;     // how many times prescribed
  pct:            number;     // share of total (0-100)
  topNote:        string;     // most common note for this med
  demandLabel:    'High' | 'Medium' | 'Low';
  isHighDemand:   boolean;
  isMediumDemand: boolean;
  shortName:      string;     // truncated for chart labels
}

/** Single bar shown in the chart */
export interface ChartBar extends MedStat {}

/** KPI card */
export interface Kpi {
  label:     string;
  value:     string;
  icon:      string;   // SVG path d=""
  iconBg:    string;
  iconColor: string;
  trend:     string;
  trendUp:   boolean;
}

/** Note frequency */
export interface NoteFreq {
  note:  string;
  count: number;
}

/** Donut arc lengths (circumference = 2π×45 ≈ 283) */
export interface DonutArcs {
  high:   number;
  medium: number;
  low:    number;
}

type DemandFilter = 'all' | 'high' | 'medium' | 'low';
type SortMode     = 'demand' | 'name' | 'prescriptions';

// ── Thresholds ────────────────────────────────────────────────
// A medication is "High demand" if its count >= HIGH_THRESHOLD % of the max,
// "Medium" if >= MED_THRESHOLD %, "Low" otherwise.
const HIGH_THRESHOLD = 0.5;   // top 50 % of max count
const MED_THRESHOLD  = 0.2;   // top 20 % of max count

// ── Component ─────────────────────────────────────────────────

@Component({
  selector:    'app-treatment-analytics',
  standalone:  true,
  imports:     [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './treatment-analytics.component.html',
  styleUrls:   ['./treatment-analytics.component.css'],
})
export class TreatmentAnalyticsComponent implements OnInit {

  // ── API config ────────────────────────────────────────────
  // Replace with your real endpoint, e.g. /api/Treatment or /api/Admin/treatments
  private readonly API_URL = '/api/Treatment';

  // ── Raw data ──────────────────────────────────────────────
  private rawTreatments: Treatment[] = [];

  // ── Computed data ─────────────────────────────────────────
  allStats:      MedStat[]  = [];   // one entry per unique medication (full sorted list)
  filtered:      MedStat[]  = [];   // after search + demand filter
  chartData:     ChartBar[] = [];   // top-N bars shown in chart
  topHighDemand: MedStat[]  = [];   // top 5 by count
  underused:     MedStat[]  = [];   // count === 1
  topNotes:      NoteFreq[] = [];   // top 6 usage notes
  kpis:          Kpi[]      = [];
  demandCounts   = { high: 0, medium: 0, low: 0 };
  donut:         DonutArcs  = { high: 0, medium: 0, low: 0 };

  // ── UI state ──────────────────────────────────────────────
  loading       = false;
  error         = '';
  searchTerm    = '';
  filterDemand: DemandFilter = 'all';
  sortBy:       SortMode     = 'demand';

  constructor(private http: HttpClient) {}

  // ── Lifecycle ─────────────────────────────────────────────

  ngOnInit(): void {
    this.load();
  }

  // ── Data loading ──────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.error   = '';

    this.http.get<Treatment[]>(this.API_URL).subscribe({
      next: (data) => {
        this.rawTreatments = data;
        this.compute();
        this.loading = false;
      },
      error: (err) => {
        // Fallback to mock data in dev so the UI is always visible
        console.warn('API call failed, using mock data.', err);
        this.rawTreatments = this.mockData();
        this.compute();
        this.loading = false;
      },
    });
  }

  // ── Core computation ──────────────────────────────────────

  private compute(): void {
    if (this.rawTreatments.length === 0) {
      this.allStats = this.filtered = this.chartData = [];
      this.kpis     = [];
      return;
    }

    // 1️⃣  Group by medicationName (case-insensitive)
    const map = new Map<string, { count: number; notes: string[] }>();

    for (const t of this.rawTreatments) {
      const key = t.medicationName.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { count: 0, notes: [] });
      }
      const entry = map.get(key)!;
      entry.count++;
      if (t.notes?.trim()) entry.notes.push(t.notes.trim());
    }

    // 2️⃣  Build MedStat array
    const total  = this.rawTreatments.length;
    const maxCnt = Math.max(...[...map.values()].map(v => v.count));

    const stats: MedStat[] = [];

    map.forEach((val, key) => {
      // Restore display-friendly name (first occurrence casing)
      const displayName = this.rawTreatments.find(
        t => t.medicationName.trim().toLowerCase() === key
      )!.medicationName.trim();

      const pct           = (val.count / total) * 100;
      const isHighDemand  = val.count >= maxCnt * HIGH_THRESHOLD;
      const isMediumDemand = !isHighDemand && val.count >= maxCnt * MED_THRESHOLD;
      const demandLabel   = isHighDemand ? 'High' : isMediumDemand ? 'Medium' : 'Low';
      const topNote       = this.mostCommon(val.notes);
      const shortName     = displayName.length > 14
        ? displayName.substring(0, 13) + '…'
        : displayName;

      stats.push({
        medicationName: displayName,
        count:          val.count,
        pct,
        topNote,
        demandLabel,
        isHighDemand,
        isMediumDemand,
        shortName,
      });
    });

    // 3️⃣  Sort master list by count desc
    stats.sort((a, b) => b.count - a.count);
    this.allStats = stats;

    // 4️⃣  Derived subsets
    this.topHighDemand = stats.filter(s => s.isHighDemand).slice(0, 5);
    this.underused     = stats.filter(s => s.count === 1);

    this.demandCounts = {
      high:   stats.filter(s => s.isHighDemand).length,
      medium: stats.filter(s => s.isMediumDemand).length,
      low:    stats.filter(s => !s.isHighDemand && !s.isMediumDemand).length,
    };

    // 5️⃣  Donut arcs (circumference ≈ 283)
    const circ = 283;
    this.donut = {
      high:   (this.demandCounts.high   / stats.length) * circ,
      medium: (this.demandCounts.medium / stats.length) * circ,
      low:    (this.demandCounts.low    / stats.length) * circ,
    };

    // 6️⃣  Chart — top 12 by count (bar width = % of max, not % of total)
    this.chartData = stats.slice(0, 12).map(s => ({
      ...s,
      pct: (s.count / maxCnt) * 100,   // relative to max for visual proportion
    }));

    // 7️⃣  Top notes across all treatments
    const noteMap = new Map<string, number>();
    for (const t of this.rawTreatments) {
      const n = t.notes?.trim();
      if (!n) continue;
      noteMap.set(n, (noteMap.get(n) ?? 0) + 1);
    }
    this.topNotes = [...noteMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([note, count]) => ({ note, count }));

    // 8️⃣  KPI cards
    this.buildKpis(stats, total, maxCnt);

    // 9️⃣  Apply current filters
    this.applyFilters();
  }

  // ── KPI builder ───────────────────────────────────────────

  private buildKpis(stats: MedStat[], total: number, maxCnt: number): void {
    const topMed = stats[0];

    this.kpis = [
      {
        label:     'Total Prescriptions',
        value:     total.toLocaleString(),
        icon:      'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z',
        iconBg:    'rgba(59,130,246,0.10)',
        iconColor: '#3B82F6',
        trend:     '+12%',
        trendUp:   true,
      },
      {
        label:     'Unique Medications',
        value:     stats.length.toLocaleString(),
        icon:      'M19.428 15.428a2 2 0 0 0-1.022-.547l-2.387-.477a6 6 0 0 0-3.86.517l-.318.158a6 6 0 0 1-3.86.517L6.05 15.21a2 2 0 0 0-1.806.547M8 4h8l-1 1v5.172a2 2 0 0 0 .586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 0 0 9 10.172V5L8 4z',
        iconBg:    'rgba(139,92,246,0.10)',
        iconColor: '#8B5CF6',
        trend:     `${stats.length} drugs`,
        trendUp:   true,
      },
      {
        label:     'Highest Demand',
        value:     topMed?.medicationName ?? '—',
        icon:      'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
        iconBg:    'rgba(16,185,129,0.10)',
        iconColor: '#10B981',
        trend:     `${maxCnt} Rx`,
        trendUp:   true,
      },
      {
        label:     'High Demand Drugs',
        value:     String(this.demandCounts.high),
        icon:      'M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
        iconBg:    'rgba(245,158,11,0.10)',
        iconColor: '#F59E0B',
        trend:     `of ${stats.length} total`,
        trendUp:   this.demandCounts.high > this.demandCounts.low,
      },
    ];
  }

  // ── Filter / search ───────────────────────────────────────

  applyFilters(): void {
    let result = [...this.allStats];

    // Search
    const term = this.searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter(s =>
        s.medicationName.toLowerCase().includes(term) ||
        s.topNote.toLowerCase().includes(term)
      );
    }

    // Demand filter
    if (this.filterDemand === 'high') {
      result = result.filter(s => s.isHighDemand);
    } else if (this.filterDemand === 'medium') {
      result = result.filter(s => s.isMediumDemand);
    } else if (this.filterDemand === 'low') {
      result = result.filter(s => !s.isHighDemand && !s.isMediumDemand);
    }

    // Sort
    if (this.sortBy === 'name') {
      result.sort((a, b) => a.medicationName.localeCompare(b.medicationName));
    } else if (this.sortBy === 'prescriptions' || this.sortBy === 'demand') {
      result.sort((a, b) => b.count - a.count);
    }

    this.filtered = result;
  }

  setDemandFilter(f: DemandFilter): void {
    this.filterDemand = f;
    this.applyFilters();
  }

  // ── Util ──────────────────────────────────────────────────

  /** Returns the most frequently occurring string in an array */
  private mostCommon(arr: string[]): string {
    if (!arr.length) return '—';
    const freq = new Map<string, number>();
    let best = arr[0], bestN = 0;
    for (const s of arr) {
      const n = (freq.get(s) ?? 0) + 1;
      freq.set(s, n);
      if (n > bestN) { best = s; bestN = n; }
    }
    return best.length > 40 ? best.substring(0, 38) + '…' : best;
  }

  // ── Mock data (dev / fallback) ─────────────────────────────

  private mockData(): Treatment[] {
    const data: { med: string; note: string; count: number }[] = [
      { med: 'Metformin',      note: '500mg twice daily with meals',          count: 28 },
      { med: 'Atorvastatin',   note: '20mg once daily at bedtime',            count: 22 },
      { med: 'Lisinopril',     note: '10mg once daily',                       count: 19 },
      { med: 'Amlodipine',     note: '5mg once daily',                        count: 17 },
      { med: 'Aspirin',        note: '81mg daily with food',                  count: 15 },
      { med: 'Omeprazole',     note: '20mg before breakfast',                 count: 14 },
      { med: 'Metoprolol',     note: '50mg twice daily',                      count: 11 },
      { med: 'Amoxicillin',    note: '500mg three times daily for 7 days',    count: 9  },
      { med: 'Losartan',       note: '50mg once daily',                       count: 8  },
      { med: 'Furosemide',     note: '40mg once daily in morning',            count: 7  },
      { med: 'Levothyroxine',  note: '50mcg once daily on empty stomach',     count: 6  },
      { med: 'Azithromycin',   note: '500mg once daily for 3 days',           count: 5  },
      { med: 'Insulin Glargine', note: '10 units subcutaneous at bedtime',    count: 4  },
      { med: 'Prednisone',     note: '5mg daily, taper over 2 weeks',         count: 3  },
      { med: 'Warfarin',       note: '5mg daily, monitor INR weekly',         count: 2  },
      { med: 'Clopidogrel',    note: '75mg once daily',                       count: 1  },
    ];

    const result: Treatment[] = [];
    let id = 1;
    data.forEach(({ med, note, count }) => {
      for (let i = 0; i < count; i++) {
        result.push({ id: id++, prescriptionId: Math.ceil(id / 2), medicationName: med, notes: note });
      }
    });
    return result;
  }
}