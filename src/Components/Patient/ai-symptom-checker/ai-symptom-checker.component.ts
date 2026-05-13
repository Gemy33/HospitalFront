// symptom-checker.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SymptomRequestDto {
  symptoms: string;
}

export interface SymptomResponseDto {
  speciality:       string;
  possibleDiseases: string[];
  advice:           string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector:    'app-symptom-checker',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './ai-symptom-checker.component.html',
  styleUrl:    './ai-symptom-checker.component.css',
})
export class AiSymptomChecker {

  private http   = inject(HttpClient);
  private router = inject(Router);

  // ── State ─────────────────────────────────────────────────────────────────

  symptomsText = '';
  isLoading    = false;
  result:       SymptomResponseDto | null = null;
  errorMsg     = '';

  // Quick-select symptom chips the user can click to pre-fill
  readonly quickSymptoms: string[] = [
    'Headache',
    'Fever',
    'Cough',
    'Sore throat',
    'Fatigue',
    'Chest pain',
    'Nausea',
    'Shortness of breath',
    'Back pain',
    'Dizziness',
  ];

  // ── Actions ───────────────────────────────────────────────────────────────

  addChip(chip: string): void {
    const current = this.symptomsText.trim();
    if (current && !current.endsWith(',')) {
      this.symptomsText = current + ', ' + chip;
    } else if (current.endsWith(',')) {
      this.symptomsText = current + ' ' + chip;
    } else {
      this.symptomsText = chip;
    }
  }

  clearAll(): void {
    this.symptomsText = '';
    this.result       = null;
    this.errorMsg     = '';
  }

  checkSymptoms(): void {
    const trimmed = this.symptomsText.trim();
    if (!trimmed) return;

    this.isLoading = true;
    this.result    = null;
    this.errorMsg  = '';

    const payload: SymptomRequestDto = { symptoms: trimmed };

    // POST /api/AiSymptomChecker/check
    this.http
      .post<SymptomResponseDto>('http://localhost:5038/api/AiSymptomChecker/check', payload)
      .subscribe({
        next: (res) => {
          this.result    = res;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('[SymptomChecker]', err);
          this.errorMsg  = 'Something went wrong. Please try again.';
          this.isLoading = false;
        },
      });
  }

  navigateToFindDoctor(): void {
    // Pass the recommended speciality as a query param so FindDoctor can pre-filter
    this.router.navigate(['/patient/find-doctor'], {
      queryParams: { speciality: this.result?.speciality ?? '' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Map speciality → a recognisable icon path (Material-style SVG d values)
  specialityIcon(speciality: string): string {
    const s = (speciality ?? '').toLowerCase();
    if (s.includes('cardio'))   return 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z';
    if (s.includes('neuro'))    return 'M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-5 0v-15A2.5 2.5 0 019.5 2zM14.5 2A2.5 2.5 0 0117 4.5v15a2.5 2.5 0 01-5 0v-15A2.5 2.5 0 0114.5 2z';
    if (s.includes('pulm') || s.includes('lung')) return 'M12 2c-4.4 0-8 3.6-8 8 0 5.4 8 12 8 12s8-6.6 8-12c0-4.4-3.6-8-8-8z';
    if (s.includes('ortho') || s.includes('bone')) return 'M6.5 2h11l-1.5 9h-8zM5 11h14v2H5zM6.5 13l1.5 9h8l1.5-9';
    if (s.includes('gastro'))   return 'M3 3h18v4H3zM5 7v10a2 2 0 002 2h10a2 2 0 002-2V7';
    if (s.includes('derm') || s.includes('skin')) return 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';
    if (s.includes('ophthal') || s.includes('eye')) return 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z';
    if (s.includes('psych') || s.includes('mental')) return 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01';
    // generic stethoscope fallback
    return 'M22 12h-4l-3 9L9 3l-3 9H2';
  }

  get canSubmit(): boolean {
    return this.symptomsText.trim().length > 2 && !this.isLoading;
  }
}