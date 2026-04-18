export interface ICreateAvailability {
     doctorId: number;
  availableFrom: string; // ISO string
  maxPatients: number;
  sessionDurationMinutes: number;
  price: number;
}
