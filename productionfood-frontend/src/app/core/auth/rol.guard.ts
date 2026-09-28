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

import {
  RolNombre
} from '../../features/usuario/models/usuario.model';

export function rolGuard(
  rolesPermitidos: RolNombre[]
): CanActivateFn {

  return () => {

    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    if (
      authService.tieneAlgunRol(
        rolesPermitidos
      )
    ) {

      return true;

    }

    return router.createUrlTree([
      '/sin-acceso'
    ]);

  };

}