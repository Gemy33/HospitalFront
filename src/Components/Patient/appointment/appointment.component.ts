import { Component, inject, OnInit } from '@angular/core';
import { Appointment, PatientService } from '../../../Core/patient.service';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [],
  templateUrl: './appointment.component.html',
  styleUrl: './appointment.component.css'
})
export class AppointmentComponent implements OnInit {

  appointments: Appointment[] = [];
  _patientService = inject(PatientService);
  ngOnInit(): void {
    this._patientService.getAppointments().subscribe({
      next: (data) => {
        console.log('Appointments:', data);
        // You can assign the data to a component property to display in the template
      },
      error: (err) => {
        console.error('Error fetching appointments:', err);
      }
    });
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    
  }

}
