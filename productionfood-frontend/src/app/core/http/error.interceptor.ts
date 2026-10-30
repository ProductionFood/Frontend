import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NotificacionService } from '../ui/notificacion.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificacion = inject(NotificacionService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Un 401 en login representa credenciales inválidas, no una sesión expirada.
      const esLogin = req.url.endsWith('/auth/login');

      if (error.status === 401 && !esLogin) {
        authService.logout(false);
        void router.navigate(['/login'], {
          queryParams: {
            sesionExpirada: 'true',
            returnUrl: router.url,
          },
        });
      } else if (error.status === 403 && !esLogin) {
        notificacion.advertencia('No tiene permisos para realizar esta acción.');
      } else if (error.status === 0) {
        notificacion.error('No se pudo conectar con el servidor.');
      } else if (error.status >= 500) {
        notificacion.error('Ocurrió un error en el servidor.');
      }

      // Se propaga el error para que cada componente maneje 400/404/409/422.
      return throwError(() => error);
    }),
  );
};
