
// doctor-dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DoctorService } from '../../../Core/doctor.service';
import { AuthService } from '../../../Core/auth.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPatients:       number;
  totalPrescriptions:  number;
  totalBookings:       number;
  confirmedBookings:   number;
  pendingBookings:     number;
  cancelledBookings:   number;
  totalRevenue:        number;
  pendingRevenue:      number;
  thisMonthRevenue:    number;
  avgBookingPrice:     number;
}

export interface RecentBooking {
  id:              number;
  patientName:     string;
  patientInitials: string;
  gender:          number;
  date:            string;
  time:            string;
  status:          number;   // 0=Pending 1=Confirmed 2=Cancelled
  price:           number;
}

export interface RevenuePoint {
  label:   string;   // e.g. "Mar", "Apr"
  amount:  number;
  bookings: number;
}

export interface QuickAction {
  label:    string;
  sublabel: string;
  route:    string;
  icon:     string;   // svg path d value
  color:    string;
  bg:       string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector:    'app-doctor-dashboard',
  standalone:  true,
  imports:     [CommonModule, RouterModule],
  templateUrl: './doctor-dashboard.component.html',
  styleUrl:    './doctor-dashboard.component.css',
})
export class DoctorDashboardComponent implements OnInit {

  private router        = inject(Router);
  private doctorService = inject(DoctorService);
  private _authService=inject(AuthService);
  doctorId:string=this._authService.Id;

  isLoading = true;
  doctorName = 'Doctor';

  stats: DashboardStats = {
    totalPatients:      0,
    totalPrescriptions: 0,
    totalBookings:      0,
    confirmedBookings:  0,
    pendingBookings:    0,
    cancelledBookings:  0,
    totalRevenue:       0,
    pendingRevenue:     0,
    thisMonthRevenue:   0,
    avgBookingPrice:    0,
  };

  recentBookings: RecentBooking[] = [];
  revenueChart:   RevenuePoint[]  = [];

  // Max value for bar chart scaling
  get chartMax(): number {
    return Math.max(...this.revenueChart.map(p => p.amount), 1);
  }

  // Quick actions grid
  quickActions: QuickAction[] = [
    {
      label:    'Set Availability',
      sublabel: 'Manage your schedule',
      route:    '/doctor/Availabilty',
      icon:     'M3 4h18v2H3zm0 7h18v2H3zm0 7h18v2H3zM16 2v4M8 2v4M16 16v4M8 16v4',
      color:    '#60A5FA',
      bg:       '#1E3A5F',
    },
    {
      label:    'Patient Bookings',
      sublabel: 'View booked slots',
      route:    '/doctor/booking/4',
      icon:     'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z',
      color:    '#34D399',
      bg:       '#0F3D2E',
    },
    {
      label:    'My Patients',
      sublabel: 'All consultations',
      route:    '/doctor/patients',
      icon:     'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z',
      color:    '#A78BFA',
      bg:       '#2E1A5F',
    },
    {
      label:    'My Profile',
      sublabel: 'Edit credentials',
      route:    '/doctor/profile/2',
      icon:     'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8zM16 3.13a4 4 0 010 7.75',
      color:    '#FBB040',
      bg:       '#3B2A0F',
    },
    {
      label:    'Start Video Call',
      sublabel: 'Launch consultation',
      route:    '/doctor/dashboard',
      icon:     'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 012 2v10a2 2 0 01-2 2H1a2 2 0 01-2-2V7a2 2 0 012-2z',
      color:    '#67E8F9',
      bg:       '#0E3A45',
    },
    {
      label:    'Prescription History',
      sublabel: 'Review all Rx records',
      route:    '/doctor/patients',
      icon:     'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M12 13v4M10 15h4',
      color:    '#F87171',
      bg:       '#3B1515',
    },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // In production, replace with real API calls:
    // forkJoin([
    //   this.doctorService.getDashboardStats(),
    //   this.doctorService.getRecentBookings(),
    // ]).subscribe(([stats, bookings]) => { ... });
   this.doctorService.getDoctorDashboard(Number(this.doctorId)).subscribe({
    next:(res)=>{
      console.log(res);
  this.stats=res;
},error:(err)=>console.log(err)
   })
    // Simulate API delay then load mock data
    setTimeout(() => {
      this.loadMockData();
      this.isLoading = false;
    }, 600);
  }

  // ── Mock data ─────────────────────────────────────────────────────────────

  private loadMockData(): void {
    this.doctorName = 'Ahmed';

    // this.stats = {
    //   totalPatients:      47,
    //   totalPrescriptions: 134,
    //   totalBookings:      89,
    //   confirmedBookings:  62,
    //   pendingBookings:    18,
    //   cancelledBookings:  9,
    //   totalRevenue:       13_750,
    //   pendingRevenue:     2_700,
    //   thisMonthRevenue:   3_200,
    //   avgBookingPrice:    200,
    // };

    this.recentBookings = [
      { id: 1010, patientName: 'Islam Ahmed',   patientInitials: 'IA', gender: 1, date: '2026-04-30', time: '08:30 AM', status: 0, price: 200 },
      { id: 1009, patientName: 'Sara Khaled',   patientInitials: 'SK', gender: 2, date: '2026-04-29', time: '10:00 AM', status: 1, price: 200 },
      { id: 1008, patientName: 'Mohamed Ali',   patientInitials: 'MA', gender: 1, date: '2026-04-28', time: '02:00 PM', status: 1, price: 250 },
      { id: 1007, patientName: 'Nour El Sayed', patientInitials: 'NE', gender: 2, date: '2026-04-27', time: '11:30 AM', status: 2, price: 200 },
      { id: 1006, patientName: 'Ahmed Hassan',  patientInitials: 'AH', gender: 1, date: '2026-04-26', time: '09:00 AM', status: 1, price: 200 },
    ];

    this.revenueChart = [
      { label: 'Nov', amount: 1800, bookings: 9  },
      { label: 'Dec', amount: 2400, bookings: 12 },
      { label: 'Jan', amount: 2100, bookings: 10 },
      { label: 'Feb', amount: 3100, bookings: 15 },
      { label: 'Mar', amount: 2850, bookings: 14 },
      { label: 'Apr', amount: 3200, bookings: 16 },
    ];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statusLabel(s: number): string {
    return s === 1 ? 'Confirmed' : s === 2 ? 'Cancelled' : 'Pending';
  }

  statusClass(s: number): string {
    return s === 1 ? 'confirmed' : s === 2 ? 'cancelled' : 'pending';
  }

  formatCurrency(n: number): string {
    return 'EGP ' + n.toLocaleString('en-US');
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  barHeight(amount: number): number {
    // Returns percentage height 0–100 for the chart bar
    return Math.round((amount / this.chartMax) * 100);
  }

  confirmedPct(): number {
    if (!this.stats.totalBookings) return 0;
    return Math.round((this.stats.confirmedBookings / this.stats.totalBookings) * 100);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  currentGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  todayDate(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
}