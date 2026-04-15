import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-prescription',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './prescription.component.html',
  styleUrls: ['./prescription.component.scss']
})
export class PrescriptionComponent {
  // Your provided JSON data structure
  prescriptionData = {
    "treatments": [
      {
        "prescriptionId": 6,
        "medicationName": "Paracetamol",
        "notes": "Take twice daily after meals",
        "id": 1,
        "createdAt": "2024-03-20T10:00:00", // Fixed date for display
        "updatedAt": "2024-03-20T10:00:00"
      },
      {
        "prescriptionId": 6,
        "medicationName": "Ibuprofen",
        "notes": "Take once daily after food",
        "id": 2,
        "createdAt": "2024-03-20T10:00:00",
        "updatedAt": "2024-03-20T10:00:00"
      }
    ],
    "doctorId": 8,
    "doctor": {
      "id": 8,
      "name": "Mostafa K.",
      "speciality": "Gynecology",
      "gender": 1,
      "yearsOfExperience": 11,
      "bio": "Gynecologist focused on women health and pregnancy care.",
      "phone": "+201234567890"
    },
    "patientId": 1,
    "id": 6
  };
}