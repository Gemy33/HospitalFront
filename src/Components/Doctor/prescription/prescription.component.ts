import { Component } from '@angular/core';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

type ActiveTab = 'create' | 'all' | 'find';

@Component({
  selector: 'app-prescription',
  standalone: true,
  imports: [],
  templateUrl: './prescription.component.html',
  styleUrl: './prescription.component.css'
})

export class PrescriptionComponent  {
  activeTab: ActiveTab = 'create';

  // Create Prescription
  prescriptionForm!: FormGroup;
  createLoading = false;
  createSuccess = false;
  createError = '';
  // createdPrescription: Prescription | null = null;

  // Get All
  // allPrescriptions: Prescription[] = [];
  allLoading = false;
  allError = '';

  // Get By ID
  searchId = '';
  // foundPrescription: Prescription | null = null;
  findLoading = false;
  findError = '';

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.prescriptionForm = this.fb.group({
      doctorId: [6, [Validators.required, Validators.min(1)]],
      patientId: [1, [Validators.required, Validators.min(1)]],
      treatments: this.fb.array([this.createTreatmentGroup()])
    });
  }

  createTreatmentGroup(): FormGroup {
    return this.fb.group({
      medicationName: ['', Validators.required],
      notes: ['', Validators.required]
    });
  }

  get treatments(): FormArray {
    return this.prescriptionForm.get('treatments') as FormArray;
  }

  addTreatment() {
    this.treatments.push(this.createTreatmentGroup());
  }

  removeTreatment(index: number) {
    if (this.treatments.length > 1) {
      this.treatments.removeAt(index);
    }
  }

  // submitPrescription() {
  //   if (this.prescriptionForm.invalid) return;
  //   this.createLoading = true;
  //   this.createError = '';
  //   this.createSuccess = false;
  //   this.createdPrescription = null;

  //   this.prescriptionService.createPrescription(this.prescriptionForm.value).subscribe({
  //     next: (res) => {
  //       this.createLoading = false;
  //       this.createSuccess = true;
  //       this.createdPrescription = res;
  //       this.prescriptionForm.reset({ doctorId: 6, patientId: 1 });
  //       this.treatments.clear();
  //       this.treatments.push(this.createTreatmentGroup());
  //     },
  //     error: (err) => {
  //       this.createLoading = false;
  //       this.createError = err?.error?.message || 'Failed to create prescription.';
  //     }
  //   });
  // }

  // loadAllPrescriptions() {
  //   this.allLoading = true;
  //   this.allError = '';
  //   this.allPrescriptions = [];

  //   this.prescriptionService.getAllPrescriptions().subscribe({
  //     next: (data) => {
  //       this.allLoading = false;
  //       this.allPrescriptions = data;
  //     },
  //     error: (err) => {
  //       this.allLoading = false;
  //       this.allError = err?.error?.message || 'Failed to load prescriptions.';
  //     }
  //   });
  // }

  // findPrescription() {
  //   if (!this.searchId) return;
  //   this.findLoading = true;
  //   this.findError = '';
  //   this.foundPrescription = null;

  //   this.prescriptionService.getPrescriptionById(Number(this.searchId)).subscribe({
  //     next: (data) => {
  //       this.findLoading = false;
  //       this.foundPrescription = data;
  //     },
  //     error: (err) => {
  //       this.findLoading = false;
  //       this.findError = err?.error?.message || 'Prescription not found.';
  //     }
  //   });
  // }

  // setTab(tab: ActiveTab) {
  //   this.activeTab = tab;
  //   if (tab === 'all') this.loadAllPrescriptions();
  // }

  trackByIndex(index: number) {
    return index;
  }
}
