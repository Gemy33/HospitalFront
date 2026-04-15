import { Component } from '@angular/core';
import { PatientNavbarComponent } from "../../Components/Patient/patient-navbar/patient-navbar.component";
import { RouterModule } from "@angular/router";

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [PatientNavbarComponent, RouterModule],
  templateUrl: './patient-layout.component.html',
  styleUrl: './patient-layout.component.css'
})
export class PatientLayoutComponent {

}
