
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
export enum Gender {
  Male = 0,
  Female = 1
}
export interface AddAdmin {
  id? : number;
  name: string;
  email: string;
  password: string;
  phone: string;
  gender: Gender;
}
export interface Doctor {
  id: number;
  name: string;
  speciality: string;
  gender: Gender;
  yearsOfExperience: number;
  bio: string;
  phone: string;
  isApproed: boolean; // keep same name as backend
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private http = inject(HttpClient);

  private baseUrl = 'http://localhost:5038/api/Admin';

  // =========================
  // 🔐 LOGIN
  // =========================
  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, data);
  }

  // =========================
  // 👤 ADMIN MANAGEMENT
  // =========================

  // Get All Admins
  getAllAdmins(): Observable<any> {
    return this.http.get<Array<AddAdmin>>(`${this.baseUrl}/getAllAdmins`);
  }

  // Add Admin
  addAdmin(data: AddAdmin): Observable<any> {
    return this.http.post(`${this.baseUrl}/addAdmin`,  data );
  }

  // Update Admin
  updateAdmin(data: AddAdmin): Observable<any> {
    return this.http.put(`${this.baseUrl}/updateAdmin/${data.id}`, data);
  }

  // Delete Admin
  deleteAdmin(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/deleteAdmin/${id}`);
    
  }

  // =========================
  // 🩺 DOCTOR MANAGEMENT
  // =========================

  // Get All Doctor
  getDoctor(id:number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/Doctor/${id}`);
  }

  // Get Pending Doctors
  getPendingDoctors(): Observable<Array<Doctor>> {
    return this.http.get<Array<Doctor>> (`${this.baseUrl}/getPendingDoctors`);
  }

  // Approve Doctor
  approveDoctor(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/approveDoctor/${id}`, {});
  }

}