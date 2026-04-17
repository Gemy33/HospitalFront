export interface IPrescription {
    id: number;
  doctorId: number;
  patientId: number;
  doctor: DoctorMini;
  treatments: PrescriptionTreatment[];
}
