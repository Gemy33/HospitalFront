import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private _http : HttpClient) { }

  
  Register(user:object,role:'doctor'|'patient'):Observable<any>
  {
  const url =
    role === 'doctor'
      ? 'http://localhost:5038/api/Doctor/Register'
      : 'http://localhost:5038/api/patient/Register';

  return this._http.post(url, user);
  }
  Login (info:object,role:'doctor'|'patient'):Observable<any>{
    const url =
    role === 'doctor'
      ? 'http://localhost:5038/api/Doctor/Login'
      : 'http://localhost:5038/api/patient/Login';

  return this._http.post(url, info);
  }
}

    
