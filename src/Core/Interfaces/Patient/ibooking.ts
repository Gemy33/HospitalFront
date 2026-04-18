import { IPatient } from "./ipatient";

export interface IBooking {
  id: number;
  consultationTime: string;
  end: string;
  appointmentDate: string;
  status: string;
  patients: IPatient[];
}