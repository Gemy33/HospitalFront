export interface UpdateDoctorProfile {
  Id: string;
  Name: string;
  specialityId: number;
  yearsOfExperienc: number; // keep same as API حتى لو فيه typo
  bio: string;
}