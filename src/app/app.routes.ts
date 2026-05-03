import { Routes } from '@angular/router';
import { PatientLayoutComponent } from './../Layouts/patient-layout/patient-layout.component';
import { DoctorLayoutComponent } from '../Layouts/doctor-layout/doctor-layout.component';
import { AuthComponent } from '../Components/auth/auth.component';
import { ProfileComponent } from '../Components/Patient/profile/profile.component';
import { FindDoctorComponent } from '../Components/Patient/find-doctor/find-doctor.component';
import { DoctorProfileComponent } from '../Components/Doctor/doctor-profile/doctor-profile.component';
import { AvailabiltyComponent } from '../Components/Doctor/availabilty/availabilty.component';
import { BookingComponent } from '../Components/Doctor/booking/booking.component';
import { PatientDashboardComponent } from '../Components/Patient/patient-dashboard/patient-dashboard.component';
import { DoctorAvailabilityComponent } from '../Components/Patient/doctor-availability/doctor-availability.component';
import { PrescriptionsComponent } from '../Components/Patient/prescription/prescription.component';
import { PrescriptionComponent } from '../Components/Doctor/prescription/prescription.component';
import { PrescriptionDetailComponent } from '../Components/Patient/prescription-detail/prescription-detail.component';

import { AppointmentsComponent } from '../Components/Patient/appointment/appointment.component';
import { DoctorApprovalComponent } from '../Components/doctor-approval/doctor-approval.component';
import { PaymentSuccessComponent } from '../Components/Patient/payment-success/payment-success.component';

import { DoctorPatientsComponent } from '../Components/Doctor/doctor-patients/doctor-patients.component';
import { PharmacyComponent } from '../Components/Patient/pharmacy/pharmacy.component';
import { ChatComponent } from '../Components/chat/chat.component';

import { DoctorDashboardComponent } from '../Components/Doctor/doctor-dashboard/doctor-dashboard.component';


export const routes: Routes = [

    {path: '', redirectTo: 'auth', pathMatch: 'full'},
    {path: 'payment-success', component: PaymentSuccessComponent, title: 'Payment Success'},
    {path: 'payment-cancelled', loadComponent: () => import('../Components/Patient/payment-cancelled/payment-cancelled.component').then(m => m.PaymentCancelledComponent), title: 'Payment Cancelled'},
    {path:'admin',component:DoctorApprovalComponent,title:'Admin'},
    {path: 'auth', component:AuthComponent},
    {path : 'patient', component:PatientLayoutComponent,
        children:[
            {path:'',redirectTo:'dashboard',pathMatch:'full'},
            {path:'profile', component:ProfileComponent },
            {path:'prescription', component:PrescriptionsComponent },
            {path:'pharmacies', component:PharmacyComponent },
            {path:"chat", component:ChatComponent},

            {path:'appointments', component:AppointmentsComponent },
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
        {path:"dashboard",component:DoctorDashboardComponent,title:'Doctor'},
        {path:'profile/:id',component:DoctorProfileComponent,title:'Doctor'},
        {path:'Availabilty',component:AvailabiltyComponent,title:'availabilty'},
        {path:'prescription',component:PrescriptionComponent,title:'prescription'},
        {path:'booking/:AvailabilityId',component:BookingComponent,title:'booking'},
        {path:'patients',component:DoctorPatientsComponent,title:'doctor patients'},
        {path:'**',redirectTo:"profile",pathMatch:'full'}
    ]},
    

];
