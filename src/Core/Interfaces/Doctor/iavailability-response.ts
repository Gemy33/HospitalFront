import { IDoctorAvailability } from "./idoctor-availability";

export interface IAvailabilityResponse {
  doctorAvailability: IDoctorAvailability;
  book_Complete: boolean;
}