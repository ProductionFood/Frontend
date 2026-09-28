import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import { inject } from '@angular/core';

import {
  catchError,
  throwError
} from 'rxjs';

import { Router } from '@angular/router';

import {
  AuthService
} from '../auth/auth.service';

import {
  NotificacionService
} from '../ui/notificacion.service';

export const errorInterceptor: HttpInterceptorFn =
  (req, next) => {

    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    const notificacion =
      inject(NotificacionService);


    return next(req).pipe(

      catchError(
        (error: HttpErrorResponse) => {

          const esLogin =
            req.url.endsWith(
              '/auth/login'
            );


          /*
           * 401 durante una petición
           * autenticada = sesión expirada.
           *
           * 401 durante /auth/login NO se
           * trata como sesión expirada.
           * Ese error debe llegar al LoginComponent
           * para mostrar "Credenciales incorrectas."
           */
          if (
            error.status === 401 &&
            !esLogin
          ) {

            authService.logout(false);

            void router.navigate(
              ['/login'],
              {
                queryParams: {
                  sesionExpirada:
                    'true'
                }
              }
            );

          }


          /*
           * Usuario autenticado pero
           * sin permisos.
           */
          else if (
            error.status === 403 &&
            !esLogin
          ) {

            notificacion.advertencia(
              'No tiene permisos para realizar esta acción.'
            );

          }


          /*
           * No se pudo establecer
           * conexión con el backend.
           */
          else if (
            error.status === 0
          ) {

            notificacion.error(
              'No se pudo conectar con el servidor.'
            );

          }


          /*
           * Error interno del backend.
           */
          else if (
            error.status >= 500
          ) {

            notificacion.error(
              'Ocurrió un error en el servidor.'
            );

          }


          return throwError(
            () => error
          );

        }
      )

    );

  };