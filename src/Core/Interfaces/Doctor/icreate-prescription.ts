import { Treatment } from "./itreatment";

export interface ICreatePrescription {
 doctorId: number;
  patientId: number;
  treatments: Treatment[];
}
