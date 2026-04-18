export interface DoctorProfile {
  id: number;
  name: string;
  speciality: string;
  gender: number;        // 1 = Male, 2 = Female, 0 = Other
  yearsOfExperience: number;
  bio: string;
  phone: string;
}
