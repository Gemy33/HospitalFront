import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';


// ✅ Import YOUR existing interfaces — do NOT redefine them locally
import { IAvailabilityItem } from '../../../Core/Interfaces/Doctor/iavailability-item';

import { DoctorService } from '../../../Core/doctor.service';
import { CreateBookingRequest, PatientService } from '../../../Core/patient.service';
import { AuthService } from '../../../Core/auth.service';

@Component({
  selector: 'app-doctor-availability',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-availability.component.html',
  styleUrls: ['./doctor-availability.component.css'],
})
export class DoctorAvailabilityComponent implements OnInit {

  doctorId = signal<number>(0);
  slots    = signal<IAvailabilityItem[]>([]);
  selected = signal<IAvailabilityItem | null>(null);
  loading  = signal(false);
  booking  = signal(false);
  error    = signal<string | null>(null);
  bookErr  = signal<string | null>(null);

  // Replace with your auth service when ready
   patientId = 2;

  available = computed(() => this.slots().filter(s => !s.book_Complete));
  booked    = computed(() => this.slots().filter(s => s.book_Complete));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private doctorSvc: DoctorService,
    private patientservice: PatientService,
    private auth: AuthService,
  ) {}


  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('doctorId'));

  var  userId = this.auth.getUserId()!;
      this.patientservice.getPatientProfileByUserId(userId).subscribe({ 
        next: (res: any) => {
          this.patientId = res.id;
          console.log(this.patientId,"Patient Id");
          this.load();
        }
      });
    console.log(id,"Doctor Id");
    console.log(this.patientId);
    
    
    this.doctorId.set(id);
    // this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.doctorSvc.getDoctorAvailabilities(this.doctorId()).subscribe({
      next: data  => { 
        console.log(data , "from load in avialiby");
        
        this.slots.set(data); this.loading.set(false);
       },
      error: ()   => { this.error.set('Could not load slots. Try again.'); this.loading.set(false); },
    });
  }

  select(slot: IAvailabilityItem): void {
    if (slot.book_Complete) return;
    this.selected.set(slot);
    this.bookErr.set(null);
  }

  clearSelection(): void { this.selected.set(null); }

  confirmBook(): void {
    const slot = this.selected();
    if (!slot) return;

    const payload: CreateBookingRequest = {
      DoctorAvailabilityId: slot.doctorAvailability.id,
      PatientId: this.patientId,
      Amount: slot.doctorAvailability.price,
      Status: 1,
    };

    this.booking.set(true);
    this.bookErr.set(null);

    this.patientservice.createBooking(payload).subscribe({
      next: (res: any) => {
        this.booking.set(false);
        const url = res?.url ?? res?.paymentUrl ?? res?.stripeUrl ?? res;
        if (typeof url === 'string' && url.startsWith('http')) {
          window.location.href = url;
        } else {
          this.bookErr.set('Booking created but no payment URL was returned.');
        }
      },
      error: () => {
        this.booking.set(false);
        this.bookErr.set('Booking failed. Please try again.');
      },
    });
  }

  goBack(): void { this.router.navigate(['/patient/find-doctors']); }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
  }

  formatDayNum(iso: string): string {
    return new Date(iso).getDate().toString();
  }

  formatMonth(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short' });
  }

  endTime(iso: string, mins: number): string {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() + mins);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  isSelected(slot: IAvailabilityItem): boolean {
    return this.selected()?.doctorAvailability.id === slot.doctorAvailability.id;
  }
}