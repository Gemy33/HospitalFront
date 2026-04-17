import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  sub?: string;
  id?: number;
  role?: string;
  exp?: number;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private _http: HttpClient) {}

  // ========================
  // 🔐 REGISTER
  // ========================
  Register(user: object, role: 'doctor' | 'patient'): Observable<any> {
    const url =
      role === 'doctor'
        ? 'http://localhost:5038/api/Doctor/Register'
        : 'http://localhost:5038/api/patient/Register';

    return this._http.post(url, user);
  }

  // ========================
  // 🔑 LOGIN + SAVE TOKEN
  // ========================
  Login(info: object, role: 'doctor' | 'patient'): Observable<any> {
    const url =
      role === 'doctor'
        ? 'http://localhost:5038/api/Doctor/Login'
        : 'http://localhost:5038/api/patient/Login';

    return this._http.post<any>(url, info).pipe(
      tap((res) => {
        // ⚠️ adjust based on your backend response
        const token = res.token || res.accessToken;

        if (token) {
          localStorage.setItem('token', token);
        }
      })
    );
  }

  // ========================
  // 📦 TOKEN METHODS
  // ========================
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  decodeToken(): DecodedToken | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode<DecodedToken>(token);
    } catch {
      return null;
    }
  }

  // ========================
  // 🎯 GET USER ID
  // ========================
  getUserId(): number | null {
    const decoded = this.decodeToken();

    return decoded?.id
      || Number(decoded?.sub)
      || Number(decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'])
      || null;
  }

  // ========================
  // 👤 GET ROLE
  // ========================
  getRole(): string | null {
    return this.decodeToken()?.role || null;
  }

  // ========================
  // 🚪 LOGOUT
  // ========================
  logout() {
    localStorage.removeItem('token');
  }
}