
// auth.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { log } from 'console';
import { AuthService } from '../../Core/auth.service';

export type UserRole = 'doctor' | 'patient';
export type AuthTab  = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,                              // ← standalone flag
  imports: [CommonModule, ReactiveFormsModule],  // ← imports here, not in a module
 templateUrl: './auth.component.html',

  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnInit {

  _authservice= inject(AuthService);

  // ── State ──────────────────────────────────────────────────────
  activeTab: AuthTab   = 'login';
  loginRole: UserRole  = 'doctor';
  registerRole: UserRole = 'doctor';

  showLoginPw    = false;
  showRegisterPw = false;
  showConfirmPw  = false;

  loginLoading    = false;
  registerLoading = false;

  toast: { visible: boolean; type: 'success' | 'error'; message: string } = {
    visible: false,
    type: 'success',
    message: '',
  };

  pwStrength      = 0;
  pwStrengthLabel = 'Enter a password';
  pwStrengthClass = '';

  specialties = [
    'Cardiology',
    'Dermatology',
    'General Practice',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Surgery',
    'Other',
  ];

  // ── Forms ──────────────────────────────────────────────────────
  loginForm!: FormGroup;
  registerForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildLoginForm();
    this.buildRegisterForm();

    this.registerForm.get('password')?.valueChanges.subscribe((val: string) => {
      this.updatePwStrength(val);
    });

    this.registerForm.get('role')?.valueChanges.subscribe(() => {
      this.updateRoleValidators();
    });
  }

  // ── Form Builders ──────────────────────────────────────────────
  private buildLoginForm(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  private buildRegisterForm(): void {
   this.registerForm = this.fb.group(
{
  role: ['doctor'],
  firstName: ['', Validators.required],
  lastName: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
  phone: ['', Validators.required],

  // NEW
  street: [''],
  city: [''],
  country: ['Egypt'],
  yearsOfExperience: [''],
  bio: [''],

  // Doctor
  specialty: [''],
  licenseNumber: [''],

  // Patient
  dateOfBirth: [''],
  gender: [''],

  password: ['', Validators.required],
  confirmPassword: ['', Validators.required],
  terms: [false, Validators.requiredTrue],
},
{ validators: this.passwordMatchValidator }
);

    this.updateRoleValidators();
  }

  // ── Validators ─────────────────────────────────────────────────
  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pw      = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (pw && confirm && pw !== confirm) {
      group.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  private updateRoleValidators(): void {
    const role = this.registerForm.get('role')?.value as UserRole;

    const specialty = this.registerForm.get('specialty');
    const license   = this.registerForm.get('licenseNumber');
    const dob       = this.registerForm.get('dateOfBirth');
    const gender    = this.registerForm.get('gender');

    if (role === 'doctor') {
      specialty?.setValidators(Validators.required);
      license?.setValidators(Validators.required);
      dob?.clearValidators();
      gender?.clearValidators();
    } else {
      specialty?.clearValidators();
      license?.clearValidators();
      dob?.setValidators(Validators.required);
      gender?.setValidators(Validators.required);
    }

    [specialty, license, dob, gender].forEach(c => c?.updateValueAndValidity());
  }

  // ── Tab & Role ─────────────────────────────────────────────────
  switchTab(tab: AuthTab): void {
    this.activeTab = tab;
  }

  setLoginRole(role: UserRole): void {
    this.loginRole = role;
  }

  setRegisterRole(role: UserRole): void {
    this.registerRole = role;
    this.registerForm.patchValue({ role });
  }

  // ── Password Visibility ────────────────────────────────────────
  toggleLoginPw():    void { this.showLoginPw    = !this.showLoginPw; }
  toggleRegisterPw(): void { this.showRegisterPw = !this.showRegisterPw; }
  toggleConfirmPw():  void { this.showConfirmPw  = !this.showConfirmPw; }

  // ── Password Strength ──────────────────────────────────────────
  private updatePwStrength(value: string): void {
    if (!value) {
      this.pwStrength = 0;
      this.pwStrengthLabel = 'Enter a password';
      this.pwStrengthClass = '';
      return;
    }
    let score = 0;
    if (value.length >= 8)           score++;
    if (/[A-Z]/.test(value))         score++;
    if (/[0-9]/.test(value))         score++;
    if (/[^A-Za-z0-9]/.test(value))  score++;

    this.pwStrength = score;
    const labels  = ['Too weak', 'Fair', 'Good', 'Strong'];
    const classes = ['weak', 'fair', 'good', 'strong'];
    this.pwStrengthLabel = labels[score - 1]  || 'Too weak';
    this.pwStrengthClass = classes[score - 1] || 'weak';
  }

  getPwBarClass(barIndex: number): string {
    return this.pwStrength >= barIndex && this.pwStrengthClass
      ? `fill-${this.pwStrengthClass}`
      : '';
  }

  // ── Form Helpers ───────────────────────────────────────────────
  isInvalid(form: FormGroup, field: string): boolean {
    const ctrl = form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  getError(form: FormGroup, field: string): string {
    const ctrl = form.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required'])   return 'This field is required.';
    if (ctrl.errors['email'])      return 'Enter a valid email address.';
    if (ctrl.errors['minlength'])  return `Minimum ${ctrl.errors['minlength'].requiredLength} characters.`;
    if (ctrl.errors['pattern'])    return 'Invalid format.';
    if (ctrl.errors['mismatch'])   return 'Passwords do not match.';
    return 'Invalid value.';
  }

  // ── Submit Handlers ────────────────────────────────────────────
  onLogin(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.loginLoading = true;
    setTimeout(() => {
      this.loginLoading = false;
      const label = this.loginRole === 'doctor' ? 'Doctor' : 'Patient';
      this.showToast('success', `✅ Welcome back, ${label}! Redirecting…`);
      // TODO: inject Router → this.router.navigate(['/dashboard'])
    }, 1800);
  }
  private mapGender(gender: string): number {
  switch (gender) {
    case 'male': return 1;
    case 'female': return 2;
    default: return 0;
  }
}

private mapSpeciality(name: string): number {
  const map: any = {
    Cardiology: 1,
    Dermatology: 2,
    'General Practice': 3,
    Neurology: 4,
    Orthopedics: 5,
    Pediatrics: 6,
    Psychiatry: 7,
    Surgery: 8,
  };

  return map[name] || 0;
}

onRegister(): void {
  console.log('Register Form Value:', this.registerForm.value); // Debug log
  this.registerForm.markAllAsTouched();
  if (this.registerForm.invalid) return;

  const form = this.registerForm.value;

  // 🔹 Common fields
  const fullName = `${form.firstName}${form.lastName}`;

  let payload: any;

  if (this.registerRole === 'patient') {
    payload = {
      name: fullName,
      gender: this.mapGender(form.gender),
      email: form.email,
      password: form.password,
      phone: form.phone,
      street: form.street || '',
      city: form.city || '',
      country: form.country || 'Egypt',
      dateOfBirth: form.dateOfBirth,
    };
  }

  if (this.registerRole === 'doctor') {
    payload = {
      name: fullName,
      email: form.email,
      password: form.password,
      specialityId: this.mapSpeciality(form.specialty),
      YearsOfExperience: form.yearsOfExperience || 0,
      bio: form.bio || '',
      gender: this.mapGender(form.gender),
      Phone: form.phone,
    };
  }

  this._authservice.Register(payload).subscribe({
    next: (response) => {
      console.log('API Response:', response);
      this.showToast('success', '✅ Registration successful! Redirecting…');
    },
    error: (error) => {
      console.error('API Error:', error);
      this.showToast('error', '❌ Registration failed. Please try again.');
    }
  });

  console.log('Final Payload:', payload);

  // 🔥 Call API here
  // this.authService.register(payload).subscribe(...)
}

  // ── Toast ──────────────────────────────────────────────────────
  private showToast(type: 'success' | 'error', message: string): void {
    this.toast = { visible: true, type, message };
    setTimeout(() => (this.toast = { ...this.toast, visible: false }), 3500);
  }
}