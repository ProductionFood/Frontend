import {
  HttpInterceptorFn
} from '@angular/common/http';

import {
  inject
} from '@angular/core';

import {
  AuthService
} from './auth.service';

export const authInterceptor: HttpInterceptorFn =
  (req, next) => {

    const authService =
      inject(AuthService);

    const token =
      authService.obtenerToken();

    if (!token) {
      return next(req);
    }

    const requestAutenticada =
      req.clone({
        setHeaders: {
          Authorization:
            `Bearer ${token}`
        }
      });

    return next(
      requestAutenticada
    );

  };