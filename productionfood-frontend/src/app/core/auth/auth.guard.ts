import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  inject
} from '@angular/core';

import {
  AuthService
} from './auth.service';

export const authGuard:
  CanActivateFn = (_route, state) => {

    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    if (
      authService.autenticado()
    ) {

      return true;

    }

    return router.createUrlTree(
      ['/login'],
      {
        queryParams: {
          returnUrl: state.url
        }
      }
    );

  };