import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        notificationService.mostrar('Sesión expirada. Redirigiendo al login...', 'error');
        router.navigate(['/login']); // Redirigimos al usuario al login de Angular
      } else if (error.status === 403) {
        notificationService.mostrar('No tienes permisos.', 'error');
      } else if (error.status === 0) {
        notificationService.mostrar('El servidor no responde.', 'error');
      }

      return throwError(() => error);
    })
  );
};