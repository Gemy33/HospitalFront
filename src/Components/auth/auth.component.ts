// auth.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../Core/auth.service';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';

export type UserRole = 'doctor' | 'patient';
export type AuthTab  = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent implements OnInit {

  private _authService = inject(AuthService);
  private fb           = inject(FormBuilder);
  private router       = inject(Router);

  // ── State ──────────────────────────────────────────────────────
  activeTab: AuthTab     = 'login';
  loginRole: UserRole    = 'doctor';
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
   { id: 1, name: 'Cardiology' },
  { id: 2, name: 'Dermatology' },
  { id: 3, name: 'Neurology' },
  { id: 4, name: 'Orthopedics' },
  { id: 5, name: 'Pediatrics' },
  { id: 6, name: 'Ophthalmology' },
  { id: 7, name: 'Gynecology' },
  { id: 8, name: 'Psychiatry' },
  { id: 9, name: 'Gastroenterology' },
  { id: 10, name: 'Endocrinology' }
  ];

  // ── Forms ──────────────────────────────────────────────────────
  loginForm!: FormGroup;
  registerForm!: FormGroup;

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
        role:              ['doctor'],
        firstName:         ['', Validators.required],
        lastName:          ['', Validators.required],
        email:             ['', [Validators.required, Validators.email]],
        phone:             ['', Validators.required],
        gender:            ['', Validators.required],   // shared by both roles

        // Address (patient only — optional for doctor)
        street:            [''],
        city:              [''],
        country:           ['Egypt'],
        dateOfBirth:       [''],                        // required only for patient

        // Doctor-specific
        specialty:         [''],                        // required only for doctor
        yearsOfExperience: [''],
        bio:               [''],

        // Passwords
        password:        ['', Validators.required],
        confirmPassword: ['', Validators.required],
        terms:           [false, Validators.requiredTrue],
      },
      { validators: this.passwordMatchValidator }
    );

    this.updateRoleValidators();
  }

  // ── Validators ─────────────────────────────────────────────────
  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pw      = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;

    const confirmCtrl = group.get('confirmPassword');

    if (pw && confirm && pw !== confirm) {
      confirmCtrl?.setErrors({ mismatch: true });
      return { mismatch: true };
    }

    // Clear only the mismatch error if passwords now match
    if (confirmCtrl?.errors?.['mismatch']) {
      const { mismatch, ...rest } = confirmCtrl.errors;
      confirmCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }

    return null;
  }

  private updateRoleValidators(): void {
    const role      = this.registerForm.get('role')?.value as UserRole;
    const specialty = this.registerForm.get('specialty');
    const dob       = this.registerForm.get('dateOfBirth');

    if (role === 'doctor') {
      specialty?.setValidators(Validators.required);
      dob?.clearValidators();
      dob?.reset('');
    } else {
      specialty?.clearValidators();
      specialty?.reset('');
      dob?.setValidators(Validators.required);
    }

    [specialty, dob].forEach(c => c?.updateValueAndValidity());
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
      this.pwStrength      = 0;
      this.pwStrengthLabel = 'Enter a password';
      this.pwStrengthClass = '';
      return;
    }
    let score = 0;
    if (value.length >= 8)          score++;
    if (/[A-Z]/.test(value))        score++;
    if (/[0-9]/.test(value))        score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    this.pwStrength      = score;
    const labels         = ['Too weak', 'Fair', 'Good', 'Strong'];
    const classes        = ['weak', 'fair', 'good', 'strong'];
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
    if (ctrl.errors['required'])  return 'This field is required.';
    if (ctrl.errors['email'])     return 'Enter a valid email address.';
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} characters.`;
    if (ctrl.errors['pattern'])   return 'Invalid format.';
    if (ctrl.errors['mismatch'])  return 'Passwords do not match.';
    return 'Invalid value.';
  }

  // ── Mappers ────────────────────────────────────────────────────
  private mapGender(gender: string): number {
    switch (gender) {
      case 'male':   return 1;
      case 'female': return 2;
      default:       return 0;
    }
  }

  private mapSpecialityId(name: string): number {
    const found = this.specialties.find(s => s.name === name);
    return found ? found.id : 0;
  }

  // ── Submit: Login ──────────────────────────────────────────────
  onLogin(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.loginLoading = true;

    this._authService.Login(this.loginForm.value, this.loginRole).subscribe({
      next: (res) => {
        this.loginLoading = false;
        const label = this.loginRole === 'doctor' ? 'Doctor' : 'Patient';
        var role = this._authService.getRole();
        this.showToast('success', `✅ Welcome back, ${label}!`);
        console.log('Decoded Token:', this._authService.decodeToken());
        console.log('role  Token:', this._authService.getRole());
        console.log('Login response:', res);
        if (label == 'Doctor' && role == 'Doctor') {
          
          this.router.navigate(['doctor/profile']);
        }
        else if (label == 'Patient' && role == 'Patient') {
          this.router.navigate(['patient/dashboard']);
        }
        else
        this.showToast('error', '❌ Login failed. Choose a valid role.');

      },
      error: (err) => {
        this.loginLoading = false;
        console.error('Login error:', err);
        this.showToast('error', '❌ Login failed. Check your email or password.');
      },
    });
  }

  // ── Submit: Register ───────────────────────────────────────────
  onRegister(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) return;

    const form     = this.registerForm.value;
    const fullName = `${form.firstName}${form.lastName}`;  // ← space between names
    let payload: any;

    if (this.registerRole === 'patient') {
      payload = {
        name:        fullName,
        gender:      this.mapGender(form.gender),
        email:       form.email,
        password:    form.password,
        phone:       form.phone,
        street:      form.street  || '',
        city:        form.city    || '',
        country:     form.country || 'Egypt',
        dateOfBirth: form.dateOfBirth,
      };
    }

    if (this.registerRole === 'doctor') {
      payload = {
        name:              fullName,
        email:             form.email,
        password:          form.password,
        specialityId:      this.mapSpecialityId(form.specialty),
        YearsOfExperience: Number(form.yearsOfExperience) || 0,
        bio:               form.bio || '',
        gender:            this.mapGender(form.gender),
        Phone:             form.phone,
      };
    }

    console.log('Register payload:', payload);
    this.registerLoading = true;

    this._authService.Register(payload, this.registerRole).subscribe({
      next: (response) => {
        this.registerLoading = false;
        console.log('Register response:', response);
        this.showToast('success', '✅ Registration successful!');
        this.router.navigate(['/login']);
      },
      error: (error) => { 
        this.registerLoading = false;
        console.error('Register error:', error);
        this.showToast('error', '❌ Registration failed. Please try again.');
      },
    });
  }

  // ── Toast ──────────────────────────────────────────────────────
  private showToast(type: 'success' | 'error', message: string): void {
    this.toast = { visible: true, type, message };
    setTimeout(() => (this.toast = { ...this.toast, visible: false }), 3500);
  }
}