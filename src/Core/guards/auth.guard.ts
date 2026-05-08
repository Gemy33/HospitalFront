import { inject } from '@angular/core';
import { CanActivateFn, RouterModule } from '@angular/router';
import {  Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem('token');
 const router = inject(Router);
if (token) {
    return true; // ✅ allow navigation
  }

  return router.createUrlTree(['/auth']); 
};