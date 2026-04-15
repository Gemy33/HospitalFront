import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Doctor {
  id: number;
  name: string;
  speciality: string;
  yearsOfExperience: number;
  phone: string;
  bio: string;
}

@Component({
  selector: 'app-find-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './find-doctor.component.html',
  styleUrls: ['./find-doctor.component.scss']
})
export class FindDoctorComponent {
  searchQuery: string = '';
  selectedSpeciality: string = '';

  // Mock list of doctors
  doctors: Doctor[] = [
    { id: 8, name: "Mostafa K.", speciality: "Gynecology", yearsOfExperience: 11, phone: "+201234567890", bio: "Expert in women health." },
    { id: 9, name: "Sarah Ahmed", speciality: "Cardiology", yearsOfExperience: 8, phone: "+201234567891", bio: "Heart specialist." },
    { id: 10, name: "Hassan Ali", speciality: "Pediatrics", yearsOfExperience: 15, phone: "+201234567892", bio: "Child care expert." }
  ];

  get filteredDoctors() {
    return this.doctors.filter(doc => 
      doc.name.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
      (this.selectedSpeciality === '' || doc.speciality === this.selectedSpeciality)
    );
  }
}