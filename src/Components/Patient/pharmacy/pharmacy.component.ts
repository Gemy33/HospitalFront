import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../Core/auth.service';
import { PatientService } from '../../../Core/patient.service';

export interface PharmacyMedication {
  id: number;
  medicationName: string;
  price: number;
  stock: number;
  unit: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  address: string;
  phone: string;
  rating: number;
  isOpen: boolean;
  medications: PharmacyMedication[];
}

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy.component.html',
  styleUrls: ['./pharmacy.component.css'],
})
export class PharmacyComponent implements OnInit {

  // ── State ────────────────────────────────────────────────────
  pharmacies      = signal<Pharmacy[]>([]);
  selected        = signal<Pharmacy | null>(null);
  pharmacySearch  = signal('');
  medSearch       = signal('');
  buying          = signal<number | null>(null);
  buySuccess      = signal<string | null>(null);
  buyError        = signal<string | null>(null);
  patientId       = signal(0);

  // ── Computed ─────────────────────────────────────────────────
  filteredPharmacies = computed(() => {
    const t = this.pharmacySearch().toLowerCase().trim();
    return this.pharmacies().filter(p =>
      !t ||
      p.name.toLowerCase().includes(t) ||
      p.address.toLowerCase().includes(t)
    );
  });

  filteredMeds = computed(() => {
    const ph = this.selected();
    if (!ph) return [];
    const t = this.medSearch().toLowerCase().trim();
    return ph.medications.filter(m =>
      !t || m.medicationName.toLowerCase().includes(t)
    );
  });

  totalMedsFound = computed(() =>
    this.pharmacies().filter(p =>
      p.medications.some(m =>
        m.medicationName.toLowerCase().includes(this.medSearch().toLowerCase().trim())
      )
    ).length
  );

  constructor(
    private auth: AuthService,
    private patientSvc: PatientService,
  ) {}

  ngOnInit(): void {
    this.loadPatientId();
    this.loadSimulatedData();
  }

  loadPatientId(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;
    this.patientSvc.getPatientProfileByUserId(userId).subscribe({
      next: (p: any) => this.patientId.set(p.id),
    });
  }

  loadSimulatedData(): void {
    this.pharmacies.set([
      {
        id: 1,
        name: 'Al-Shifa Pharmacy',
        address: '12 Tahrir Square, Cairo',
        phone: '+20 2 2355 1100',
        rating: 4.8,
        isOpen: true,
        medications: [
          { id: 101, medicationName: 'Paracetamol', price: 5.50,  stock: 120, unit: '500mg Tablet' },
          { id: 102, medicationName: 'Ibuprofen',   price: 8.00,  stock: 80,  unit: '400mg Tablet' },
          { id: 103, medicationName: 'Amoxicillin', price: 22.00, stock: 45,  unit: '500mg Capsule' },
          { id: 104, medicationName: 'Omeprazole',  price: 14.00, stock: 60,  unit: '20mg Capsule' },
          { id: 105, medicationName: 'Metformin',   price: 12.00, stock: 90,  unit: '500mg Tablet' },
        ],
      },
      {
        id: 2,
        name: 'El-Ezaby Pharmacy',
        address: '45 Nasr City, Cairo',
        phone: '+20 2 2401 7700',
        rating: 4.6,
        isOpen: true,
        medications: [
          { id: 201, medicationName: 'Paracetamol',  price: 4.75,  stock: 200, unit: '500mg Tablet' },
          { id: 202, medicationName: 'Cetirizine',   price: 9.50,  stock: 55,  unit: '10mg Tablet' },
          { id: 203, medicationName: 'Atorvastatin', price: 35.00, stock: 30,  unit: '20mg Tablet' },
          { id: 204, medicationName: 'Metformin',    price: 11.50, stock: 110, unit: '850mg Tablet' },
          { id: 205, medicationName: 'Aspirin',      price: 6.00,  stock: 150, unit: '75mg Tablet' },
        ],
      },
      {
        id: 3,
        name: 'Seif Pharmacy',
        address: '7 Mohandessin, Giza',
        phone: '+20 2 3749 2200',
        rating: 4.5,
        isOpen: false,
        medications: [
          { id: 301, medicationName: 'Ibuprofen',    price: 7.50,  stock: 70,  unit: '200mg Tablet' },
          { id: 302, medicationName: 'Amoxicillin',  price: 20.00, stock: 30,  unit: '250mg Capsule' },
          { id: 303, medicationName: 'Omeprazole',   price: 13.50, stock: 40,  unit: '20mg Capsule' },
          { id: 304, medicationName: 'Azithromycin', price: 45.00, stock: 20,  unit: '500mg Tablet' },
          { id: 305, medicationName: 'Metformin',    price: 10.00, stock: 95,  unit: '500mg Tablet' },
        ],
      },
      {
        id: 4,
        name: 'Dawaya Pharmacy',
        address: '89 Heliopolis, Cairo',
        phone: '+20 2 2416 9900',
        rating: 4.9,
        isOpen: true,
        medications: [
          { id: 401, medicationName: 'Paracetamol',  price: 5.00,  stock: 180, unit: '500mg Tablet' },
          { id: 402, medicationName: 'Cetirizine',   price: 8.75,  stock: 65,  unit: '10mg Tablet' },
          { id: 403, medicationName: 'Atorvastatin', price: 33.00, stock: 25,  unit: '40mg Tablet' },
          { id: 404, medicationName: 'Azithromycin', price: 42.00, stock: 15,  unit: '250mg Tablet' },
          { id: 405, medicationName: 'Aspirin',      price: 5.50,  stock: 130, unit: '100mg Tablet' },
        ],
      },
    ]);
  }

  // ── Actions ──────────────────────────────────────────────────

  selectPharmacy(p: Pharmacy): void {
    this.selected.set(p);
    this.medSearch.set('');
    this.buySuccess.set(null);
    this.buyError.set(null);
  }

  clearSelected(): void {
    this.selected.set(null);
    this.medSearch.set('');
  }

  buyMedication(med: PharmacyMedication): void {
    if (!this.selected()?.isOpen) return;
    this.buying.set(med.id);
    this.buySuccess.set(null);
    this.buyError.set(null);

    // Simulate Stripe redirect — replace with real API call later
    setTimeout(() => {
      // In production: call your backend to create Stripe session
      // this.patientSvc.createMedicationOrder({...}).subscribe(res => window.location.href = res.stripeUrl)
      this.buying.set(null);
      this.buySuccess.set(
        `Order placed for ${med.medicationName} — $${med.price.toFixed(2)}`
      );
    }, 1400);
  }

  // ── Helpers ──────────────────────────────────────────────────

  stars(rating: number): string[] {
    return Array.from({ length: 5 }, (_, i) =>
      i < Math.floor(rating) ? 'full' : i < rating ? 'half' : 'empty'
    );
  }

  stockClass(stock: number): string {
    if (stock > 50) return 'ph-stock--high';
    if (stock > 10) return 'ph-stock--mid';
    return 'ph-stock--low';
  }

  stockLabel(stock: number): string {
    if (stock > 50) return 'In stock';
    if (stock > 10) return 'Limited';
    return 'Low stock';
  }

  pharmacyHasMed(p: Pharmacy, term: string): boolean {
    if (!term.trim()) return false;
    return p.medications.some(m =>
      m.medicationName.toLowerCase().includes(term.toLowerCase().trim())
    );
  }
}