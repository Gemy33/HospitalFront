import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';


// Interfaces (you can adjust based on your backend)
export interface PatientProfile {
  id: number;
  name: string;
  gender: string;
  email: string;
  phone: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  doctorAvailabilityId: number;

  consultionTime: string;
  status: number;

  doctorAvailability: {
    doctorId: number;
    availableFrom: string;
    maxPatients: number;
    sessionDurationMinutes: number;
    price: number;
    id: number;
  };
}

export interface CreateBookingRequest {
  DoctorAvailabilityId: number;
  PatientId: number;
  Amount: number;
  Status:number;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private http = inject(HttpClient);
  private mapStatus(status: number): string {
  switch (status) {
    case 0: return 'Pending';
    case 1: return 'Cancelled';
    case 2: return 'Confirmed';
    default: return 'Unknown';
  }
}

  private baseUrl = 'http://localhost:5038/api/patient';

  // ✅ 1. Create Booking
  createBooking(data: CreateBookingRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/Book`, data);
  }

  // ✅ 2. Get Patient Profile
  getProfile(id: number): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(`${this.baseUrl}/Profile/${id}`);
  }

  // ✅ 3. Get All Appointments

getAppointments() {
  return this.http.get<Appointment[]>(`${this.baseUrl}/appointments`)
    .pipe(
      map((appointments) =>
        appointments.map(a => ({
          id: a.id,
          date: a.consultionTime,
          doctorId: a.doctorAvailability.doctorId,
          price: a.doctorAvailability.price,
          status: this.mapStatus(a.status)
        }))
      )
    );
}
}