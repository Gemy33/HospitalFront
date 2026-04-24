import { Routes } from '@angular/router';
import { PatientLayoutComponent } from './../Layouts/patient-layout/patient-layout.component';
import { DoctorLayoutComponent } from '../Layouts/doctor-layout/doctor-layout.component';
import { AuthComponent } from '../Components/auth/auth.component';
import { ProfileComponent } from '../Components/Patient/profile/profile.component';
import { AppointmentComponent } from '../Components/Patient/appointment/appointment.component';
import { find } from 'rxjs';
import { FindDoctorComponent } from '../Components/Patient/find-doctor/find-doctor.component';
import { DoctorProfileComponent } from '../Components/Doctor/doctor-profile/doctor-profile.component';
import { AvailabiltyComponent } from '../Components/Doctor/availabilty/availabilty.component';
import { BookingComponent } from '../Components/Doctor/booking/booking.component';
import { PatientDashboardComponent } from '../Components/Patient/patient-dashboard/patient-dashboard.component';
import { DoctorAvailabilityComponent } from '../Components/Patient/doctor-availability/doctor-availability.component';
import { PrescriptionsComponent } from '../Components/Patient/prescription/prescription.component';
import { PrescriptionComponent } from '../Components/Doctor/prescription/prescription.component';
import { PrescriptionDetailComponent } from '../Components/Patient/prescription-detail/prescription-detail.component';

export const routes: Routes = [
    {path: '', redirectTo: 'auth', pathMatch: 'full'},
     {path: 'auth', component:AuthComponent},
    {path : 'patient', component:PatientLayoutComponent,
        children:[
            {path:'profile', component:ProfileComponent },
            {path:'prescription', component:PrescriptionsComponent },
            {path:'appointments', component:AppointmentComponent },
            {path:'find-doctors', component:FindDoctorComponent },
            {path:'dashboard', component:PatientDashboardComponent },
            {
             path: 'doctor/:doctorId/availability',component: DoctorAvailabilityComponent,title:'Doctor Availability'},
             {
  path: 'prescription/:prescriptionId', component:PrescriptionDetailComponent, title:'Prescription Detail'
  
}


        ]
    },
    {path:'doctor',component:DoctorLayoutComponent,children:[
        {path:'',redirectTo:'profile',pathMatch:'full'},
        {path:'profile/:id',component:DoctorProfileComponent,title:'Doctor'},
        {path:'Availabilty',component:AvailabiltyComponent,title:'availabilty'},
        {path:'prescription',component:PrescriptionComponent,title:'prescription'},
        {path:'booking/:AvailabilityId',component:BookingComponent,title:'booking'},
        {path:'**',redirectTo:"profile",pathMatch:'full'}
    ]},

];
