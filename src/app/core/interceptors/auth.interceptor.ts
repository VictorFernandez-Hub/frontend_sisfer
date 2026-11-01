import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Adjuntamos cookies de sesión
  const authReq = req.clone({
    withCredentials: true
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // SOLO redirigir al login si la sesión expiro o no existe (401)
      if (error.status === 401) {
        localStorage.clear();
        sessionStorage.clear();
        router.navigate(['/auth/login']);
      }
      
      // Si es 403 (Permisos insuficientes), simplemente mostramos el error sin destruir la sesión
      if (error.status === 403) {
        console.warn('No tienes permisos suficientes para acceder a este recurso.');
      }

      return throwError(() => error);
    })
  );
};