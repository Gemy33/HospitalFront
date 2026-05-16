
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../Core/admin.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {

  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal<string | null>(null);
  showPass = signal(false);

  constructor(
    private adminSvc: AdminService,
    private router:   Router,
  ) {}
  togglePassword() {
  this.showPass.update(v => !v);
}

  login(): void {
    if (!this.email.trim() || !this.password.trim()) {
      this.error.set('Email and password are required.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.adminSvc.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        console.log(res);
        
        // ✅ Store token — adjust key name to match your auth service
        const token = res?.token ;
        if (token && typeof token === 'string') {
          localStorage.setItem('token', token);
        }
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.message ?? 'Invalid email or password.'
        );
      },
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.login();
  }
}