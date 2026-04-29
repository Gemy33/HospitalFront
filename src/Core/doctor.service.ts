import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from './Environment';
import { DoctorProfile } from './Interfaces/Doctor/doctor-profile';
import { UpdateDoctorProfile } from './Interfaces/Doctor/update-doctor-profile';
import { ICreateAvailability } from './Interfaces/Doctor/icreate-availability';
import { ICreatePrescription } from './Interfaces/Doctor/icreate-prescription';
import { IPrescription } from './Interfaces/Doctor/iprescription';
import { IBooking } from './Interfaces/Patient/ibooking';
import { IAvailabilityItem } from './Interfaces/Doctor/iavailability-item';
import { IAvailabilityResponse } from './Interfaces/Doctor/iavailability-response';
import { observableToBeFn } from 'rxjs/internal/testing/TestScheduler';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {

  constructor(private http: HttpClient) { }
 private baseurl:string=environment.baseUrl;
  getDoctorProfile(doctorId:string|null): Observable<DoctorProfile> {
    return this.http.get<DoctorProfile>(`${this.baseurl}/doctor/profile/${doctorId}`);
  }
  updateDoctorProfile(data: UpdateDoctorProfile): Observable<any> {
    return this.http.put(
      `${this.baseurl}/doctor/Profile`,
      data
    );
  }
  createAvailability(data: ICreateAvailability): Observable<any> {
    return this.http.post(
      `${this.baseurl}/Doctor/availability`,
      data
    );
  }
  GetAvailabilitie(availabilitieId: number): Observable<IAvailabilityResponse> {
  return this.http.get<IAvailabilityResponse>(
    `${this.baseurl}/Doctor/availabilitie/${availabilitieId}`
  )
}
  getDoctorAvailabilities(doctorId: number): Observable<IAvailabilityItem[]> {
  return this.http.get<IAvailabilityItem[]>(
    `${this.baseurl}/Doctor/availabilities/${doctorId}`
  );

}

 updateAvailability(data: any): Observable<any> {
  return this.http.put(
    `${this.baseurl}/Doctor/availabilities`,
    data
  );
}

 deleteAvailability(availabilityId: number): Observable<any> {
  return this.http.delete(
    `${this.baseurl}/Doctor/availability/${availabilityId}`
  );
}

 getBookingPatients(doctorId: string|null): Observable<IBooking> {
  return this.http.get<IBooking>(
    `${this.baseurl}/Doctor/BookingPatients/${doctorId}`
  );
}

  createPrescription(data: ICreatePrescription): Observable<any> {
    return this.http.post(
      `${this.baseurl}/Doctor/Prescription`,
      data
    );
}
 getPrescription(prescriptionId: number): Observable<IPrescription> {
  return this.http.get<IPrescription>(
    `${this.baseurl}/Doctor/Prescription/${prescriptionId}`
  );
}

getPatientPrescriptions(patientId: number): Observable<IPrescription[]> {
  return this.http.get<IPrescription[]>(
    `${this.baseurl}/Doctor/Prescriptions/${patientId}`
  );
}

getDoctorPatientsWithHisPrescriptions(doctorId:number):Observable<any>{
  return this.http.get(`${this.baseurl}/Doctor/DoctorPatients/2002`)
}

}

