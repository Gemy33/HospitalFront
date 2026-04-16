import { Component } from '@angular/core';
import { DoctorNavbarComponent } from '../../Components/Doctor/doctor-navbar/doctor-navbar.component';
import { RouterOutlet } from '@angular/router';
import { DoctorProfileComponent } from '../../Components/Doctor/doctor-profile/doctor-profile.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [DoctorNavbarComponent,RouterOutlet,DoctorProfileComponent],
  templateUrl: './doctor-layout.component.html',
  styleUrl: './doctor-layout.component.css'
})
export class DoctorLayoutComponent {

}
