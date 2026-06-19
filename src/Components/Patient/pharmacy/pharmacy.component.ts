import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

export type DeliveryType = 'pickup' | 'delivery';
export type OrderStatus  = 'pending' | 'confirmed' | 'received';

export interface PharmacyOrder {
  id: string;
  pharmacyId: number;
  pharmacyName: string;
  pharmacyAddress: string;
  medication: PharmacyMedication;
  deliveryType: DeliveryType;
  status: OrderStatus;
  patientId: number;
  createdAt: string;
  total: number;
}

const ORDERS_KEY = 'ph_orders';

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy.component.html',
  styleUrls: ['./pharmacy.component.css']
  
})
export class PharmacyComponent implements OnInit {

  // ── View state ───────────────────────────────────────────────
  view = signal<'pharmacies' | 'orders'>('pharmacies');

  // ── Pharmacy state ───────────────────────────────────────────
  pharmacies     = signal<Pharmacy[]>([]);
  selected       = signal<Pharmacy | null>(null);
  pharmacySearch = signal('');
  medSearch      = signal('');
  patientId      = signal(0);

  // ── Delivery modal state ─────────────────────────────────────
  showDeliveryModal  = signal(false);
  pendingMed         = signal<PharmacyMedication | null>(null);
  selectedDelivery   = signal<DeliveryType | null>(null);
  buying             = signal<number | null>(null);
  buySuccess         = signal<string | null>(null);
  buyError           = signal<string | null>(null);

  // ── Orders ───────────────────────────────────────────────────
  orders = signal<PharmacyOrder[]>([]);

  // ── Computed ─────────────────────────────────────────────────
  filteredPharmacies = computed(() => {
    const t = this.pharmacySearch().toLowerCase().trim();
    return this.pharmacies().filter(p =>
      !t || p.name.toLowerCase().includes(t) || p.address.toLowerCase().includes(t)
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

  pendingOrders   = computed(() => this.orders().filter(o => o.status === 'pending'));
  confirmedOrders = computed(() => this.orders().filter(o => o.status === 'confirmed'));
  receivedOrders  = computed(() => this.orders().filter(o => o.status === 'received'));
  totalOrders     = computed(() => this.orders().length);

  constructor(
    private auth: AuthService,
    private patientSvc: PatientService,
  ) {}

  ngOnInit(): void {
    this.loadPatientId();
    this.loadSimulatedData();
    this.loadOrders();
  }

  // ── Patient ──────────────────────────────────────────────────

  loadPatientId(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;
    this.patientSvc.getPatientProfileByUserId(userId).subscribe({
      next: (p: any) => this.patientId.set(p.id),
    });
  }

  // ── Orders (localStorage) ────────────────────────────────────

  loadOrders(): void {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const all: PharmacyOrder[] = raw ? JSON.parse(raw) : [];
      // Filter to current patient if id is known — or show all for now
      this.orders.set(all);
    } catch {
      this.orders.set([]);
    }
  }

  saveOrders(list: PharmacyOrder[]): void {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
    } catch {}
  }

  // ── Pharmacy actions ─────────────────────────────────────────

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

  // Opens the delivery modal before buying
  inititateBuy(med: PharmacyMedication): void {
    if (!this.selected()?.isOpen) return;
    this.pendingMed.set(med);
    this.selectedDelivery.set(null);
    this.showDeliveryModal.set(true);
  }

  closeDeliveryModal(): void {
    this.showDeliveryModal.set(false);
    this.pendingMed.set(null);
    this.selectedDelivery.set(null);
  }

  confirmBuy(): void {
    const med      = this.pendingMed();
    const pharmacy = this.selected();
    const delivery = this.selectedDelivery();

    if (!med || !pharmacy || !delivery) return;

    this.buying.set(med.id);
    this.buySuccess.set(null);
    this.buyError.set(null);
    this.showDeliveryModal.set(false);

    // Simulate Stripe / payment — replace with real API call
    setTimeout(() => {
      const order: PharmacyOrder = {
        id:              `ORD-${Date.now()}`,
        pharmacyId:      pharmacy.id,
        pharmacyName:    pharmacy.name,
        pharmacyAddress: pharmacy.address,
        medication:      med,
        deliveryType:    delivery,
        status:          'pending',
        patientId:       this.patientId(),
        createdAt:       new Date().toISOString(),
        total:           med.price,
      };

      const updated = [order, ...this.orders()];
      this.orders.set(updated);
      this.saveOrders(updated);

      this.buying.set(null);
      this.buySuccess.set(
        `Order placed for ${med.medicationName} — $${med.price.toFixed(2)}`
      );
    }, 1400);
  }

  // Mark order as received by patient
  markReceived(orderId: string): void {
    const updated = this.orders().map(o =>
      o.id === orderId ? { ...o, status: 'received' as OrderStatus } : o
    );
    this.orders.set(updated);
    this.saveOrders(updated);
  }

  // Delete an order from history
  deleteOrder(orderId: string): void {
    const updated = this.orders().filter(o => o.id !== orderId);
    this.orders.set(updated);
    this.saveOrders(updated);
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

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  orderStatusLabel(s: OrderStatus): string {
    return { pending: 'Pending', confirmed: 'Confirmed', received: 'Received' }[s];
  }

  orderStatusClass(s: OrderStatus): string {
    return {
      pending:   'ph-order-status--pending',
      confirmed: 'ph-order-status--confirmed',
      received:  'ph-order-status--received',
    }[s];
  }

  deliveryLabel(d: DeliveryType): string {
    return d === 'delivery' ? '🚚 Delivery' : '🏪 Pickup';
  }

  // ── Data ─────────────────────────────────────────────────────

  loadSimulatedData(): void {
    this.pharmacies.set([
      {
        id: 1, name: 'Al-Shifa Pharmacy',
        address: '12 Tahrir Square, Cairo',
        phone: '+20 2 2355 1100', rating: 4.8, isOpen: true,
        medications: [
          { id: 101, medicationName: 'Paracetamol', price: 5.50,  stock: 120, unit: '500mg Tablet' },
          { id: 102, medicationName: 'Ibuprofen',   price: 8.00,  stock: 80,  unit: '400mg Tablet' },
          { id: 103, medicationName: 'Amoxicillin', price: 22.00, stock: 45,  unit: '500mg Capsule' },
          { id: 104, medicationName: 'Omeprazole',  price: 14.00, stock: 60,  unit: '20mg Capsule' },
          { id: 105, medicationName: 'Metformin',   price: 12.00, stock: 90,  unit: '500mg Tablet' },
        ],
      },
      {
        id: 2, name: 'El-Ezaby Pharmacy',
        address: '45 Nasr City, Cairo',
        phone: '+20 2 2401 7700', rating: 4.6, isOpen: true,
        medications: [
          { id: 201, medicationName: 'Paracetamol',  price: 4.75,  stock: 200, unit: '500mg Tablet' },
          { id: 202, medicationName: 'Cetirizine',   price: 9.50,  stock: 55,  unit: '10mg Tablet' },
          { id: 203, medicationName: 'Atorvastatin', price: 35.00, stock: 30,  unit: '20mg Tablet' },
          { id: 204, medicationName: 'Metformin',    price: 11.50, stock: 110, unit: '850mg Tablet' },
          { id: 205, medicationName: 'Aspirin',      price: 6.00,  stock: 150, unit: '75mg Tablet' },
        ],
      },
      {
        id: 3, name: 'Seif Pharmacy',
        address: '7 Mohandessin, Giza',
        phone: '+20 2 3749 2200', rating: 4.5, isOpen: false,
        medications: [
          { id: 301, medicationName: 'Ibuprofen',    price: 7.50,  stock: 70,  unit: '200mg Tablet' },
          { id: 302, medicationName: 'Amoxicillin',  price: 20.00, stock: 30,  unit: '250mg Capsule' },
          { id: 303, medicationName: 'Omeprazole',   price: 13.50, stock: 40,  unit: '20mg Capsule' },
          { id: 304, medicationName: 'Azithromycin', price: 45.00, stock: 20,  unit: '500mg Tablet' },
          { id: 305, medicationName: 'Metformin',    price: 10.00, stock: 95,  unit: '500mg Tablet' },
        ],
      },
      {
        id: 4, name: 'Dawaya Pharmacy',
        address: '89 Heliopolis, Cairo',
        phone: '+20 2 2416 9900', rating: 4.9, isOpen: true,
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
}