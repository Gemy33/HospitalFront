
export interface IBookingPatients {
  id: number;
  patientId: number;
  patient: Patient;
  doctorAvailabilityId: number;
  doctorAvailability:  null;
  status: number;
  consultionTime: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}
export enum AppointmentStatus {
  Pending = 0,
  Confirmed = 1,
  Cancelled = 2
}
export interface User {
  id: number;
  userName: string;
  normalizedUserName: string;
  email: string;
  normalizedEmail: string;
  emailConfirmed: boolean;
  passwordHash: string;
  securityStamp: string;
  concurrencyStamp: string;
  phoneNumber: string;
  phoneNumberConfirmed: boolean;
  twoFactorEnabled: boolean;
  lockoutEnd: string | null;
  lockoutEnabled: boolean;
  accessFailedCount: number;
  gender: number;
  createdAt: string;
  updatedAt: string;
}
export interface Address {
  street: string;
  city: string;
  country: string;
}export interface Patient {
  id: number;
  userId: number;
  dateOfBirath: string;
  address: Address;
  user: User;
  createdAt: string;
  updatedAt: string;
}