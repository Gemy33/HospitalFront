import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IPrescription } from '../../../Core/Interfaces/Doctor/iprescription';
import { DoctorService } from '../../../Core/doctor.service';

@Component({
  selector: 'app-prescription-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prescription-detail.component.html',
  styleUrls: ['./prescription-detail.component.css'],
})
export class PrescriptionDetailComponent implements OnInit {

  prescription = signal<IPrescription | null>(null);
  loading      = signal(false);
  error        = signal<string | null>(null);

  private readonly patientId = 3;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private doctorSvc: DoctorService  ,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('prescriptionId'));
    this.load(id);
  }

  load(targetId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.doctorSvc.getPatientPrescriptions(this.patientId).subscribe({
      next: list => {
        const found = list.find(p => p.id === targetId) ?? null;
        this.prescription.set(found);
        if (!found) this.error.set('Prescription not found.');
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load prescription.');
        this.loading.set(false);
      },
    });
  }

  printPdf(): void { window.print(); }

  goBack(): void { this.router.navigate(['/patient/prescription']); }

  getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  getGenderIcon(gender: number): string {
    return gender === 1 ? '♀' : '♂';
  }
}