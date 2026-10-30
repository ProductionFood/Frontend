import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

import { ConexionService } from './conexion.service';

/** Registra si el servidor respondió, para el indicador de conexión del sidebar. */
export const conexionInterceptor: HttpInterceptorFn = (req, next) => {
  const conexion = inject(ConexionService);

  return next(req).pipe(
    tap({
      next: evento => {
        if (evento instanceof HttpResponse) conexion.marcarRespuesta();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 0) {
          conexion.marcarSinServidor();
        } else {
          conexion.marcarRespuesta();
        }
      }
    })
  );
};
