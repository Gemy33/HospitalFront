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


export interface IDoctorAvailabilitySnapshot {
  doctorId: number;
  doctor: null;
  availableFrom: string;
  maxPatients: number;
  sessionDurationMinutes: number;
  price: number;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface IAppointment {
  patientId: number;
  patient: null;
  doctorAvailabilityId: number;
  doctorAvailability: IDoctorAvailabilitySnapshot;
  status: number;
  consultionTime: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor{
  id:number;
  name:string;
  gender : number;
  bio : string;
  phone:string;
  speciality : string;
  yearsOfExperience : string;
}

export interface CreateBookingRequest {
  DoctorAvailabilityId: number;
  PatientId: number;
  Amount: number;
}
 export interface updatepatientprofile
 {
  name: string;
  email: string;
  phone: string;
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
  confirmBooking(sessionId: string): Observable<any> {
  return this.http.post(
    `${this.baseUrl}/confirm?sessionId=${sessionId}`,
    {}
  );
}

  // ✅ 2. Get Patient Profile
  getProfile(id: number): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(`${this.baseUrl}/Profile/${id}`);
  }

  // ✅ 3. Get All Appointments

getAppointments(patientId: number): Observable<IAppointment[]> {
  return this.http.get<IAppointment[]>(
    `${this.baseUrl}/appointments/${patientId}`
  );
}



 // 4. Get all Doctors

 getAllDoctors():Observable<any>
 {
   return this.http.get<Doctor[]>(`${this.baseUrl}/Doctors`);
 }


 // update patient profile
  updateProfile(id:number, data:updatepatientprofile):Observable<any> 
  {
    return this.http.put(`${this.baseUrl}/UpdateProfile/${id}`, data);
  }

 // get all doctor by speciality
  getAllDoctorsBySpeciality(spcId:number):Observable<any>
 {
   return this.http.get<Doctor[]>(`${this.baseUrl}/Doctors/${spcId}`);
 }

 // get patient profile by userId
  getPatientProfileByUserId(userId:number):Observable<any>
  {
    return this.http.get<PatientProfile>(`${this.baseUrl}/${userId}`);
  }

}