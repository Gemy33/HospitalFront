import { Component } from '@angular/core';
import { DoctorNavbarComponent } from '../../Components/Doctor/doctor-navbar/doctor-navbar.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [DoctorNavbarComponent],
  templateUrl: './doctor-layout.component.html',
  styleUrl: './doctor-layout.component.css'
})
export class DoctorLayoutComponent {

}
