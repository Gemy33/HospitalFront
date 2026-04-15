import { Routes } from '@angular/router';
import { PatientLayoutComponent } from './../Layouts/patient-layout/patient-layout.component';
import { DoctorLayoutComponent } from '../Layouts/doctor-layout/doctor-layout.component';
import { AuthComponent } from '../Components/auth/auth.component';
import { ProfileComponent } from '../Components/Patient/profile/profile.component';
import { PrescriptionComponent } from '../Components/Patient/prescription/prescription.component';
import { AppointmentComponent } from '../Components/Patient/appointment/appointment.component';
import { find } from 'rxjs';
import { FindDoctorComponent } from '../Components/Patient/find-doctor/find-doctor.component';

export const routes: Routes = [
    {path: '', redirectTo: 'auth', pathMatch: 'full'},
     {path: 'auth', component:AuthComponent},
    {path : 'patient', component:PatientLayoutComponent,
        children:[
            {path:'profile', component:ProfileComponent },
            {path:'prescriptions', component:PrescriptionComponent },
            {path:'appointments', component:AppointmentComponent },
            {path:'find-doctors', component:FindDoctorComponent },
        ]
    },
    {path:'doctor',component:DoctorLayoutComponent},

];
