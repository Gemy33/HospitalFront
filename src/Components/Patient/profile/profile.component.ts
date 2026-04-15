import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Patient {
  id: number;
  name: string;
  gender: number;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  // Mocking the data based on your JSON structure
  patientData: Patient = {
    id: 2,
    name: "Ahmed Hassan",
    gender: 0,
    email: "ahmed.hassanff@example.com",
    phone: "+201234567890"
  };

  getGender(value: number): string {
    return value === 0 ? 'Male' : 'Female';
  }

  ngOnInit(): void {}
}