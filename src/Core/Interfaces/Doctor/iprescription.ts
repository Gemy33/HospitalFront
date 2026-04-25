import { IDoctorMini } from "./idoctor-mini";
import { IPrescriptionTreatment } from "./iprescription-treatment";

export interface IPrescription {
    id: number;
  doctorId: number;
  patientId: number;
  doctor: IDoctorMini;
  diagnosis:string;
  treatments: IPrescriptionTreatment[];
}
