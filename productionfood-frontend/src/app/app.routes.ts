import { ActivatedRouteSnapshot, ResolveFn, Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { rolGuard } from './core/auth/rol.guard';
import { NAV_GRUPOS } from './layout/nav-items';

/** Módulos con implementación real (no redirigen a construcción). */
const MODULOS_REALES = ['dashboard', 'usuarios', 'bitacora'];

/**
 * Título del topbar para `/app/en-construccion/:ruta`, resuelto desde
 * NAV_GRUPOS (fallback: "Módulo en construcción").
 */
const resolverTituloConstruccion: ResolveFn<string> = route => {
  const item = NAV_GRUPOS.flatMap(grupo => grupo.items).find(
    i => i.ruta === route.paramMap.get('ruta')
  );
  return item?.titulo ?? 'Módulo en construcción';
};

/**
 * Módulos pendientes: solo redirigen a la ruta genérica
 * `/app/en-construccion/:ruta`, que resuelve nombre, HU, descripción e icono
 * desde NAV_GRUPOS. Un único componente compartido, sin duplicar rutas.
 */
const redirectsPendientes: Routes = NAV_GRUPOS
  .flatMap(grupo => grupo.items)
  .filter(item => !MODULOS_REALES.includes(item.ruta))
  .map(item => ({
    path: item.ruta,
    redirectTo: `en-construccion/${item.ruta}`,
    pathMatch: 'full' as const
  }));

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component')
        .then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/layout.component')
        .then(m => m.LayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'usuarios',
        canActivate: [rolGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/usuario/usuario.routes')
            .then(m => m.USUARIO_ROUTES),
        data: { titulo: 'Usuarios' }
      },
      {
        path: 'bitacora',
        canActivate: [rolGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/bitacora/bitacora.routes')
            .then(m => m.BITACORA_ROUTES),
        data: { titulo: 'Bitácora' }
      },
      {
        // Ruta única genérica para todos los módulos pendientes.
        path: 'en-construccion/:ruta',
        loadComponent: () =>
          import('./features/en-construccion/en-construccion.component')
            .then(m => m.EnConstruccionComponent),
        resolve: { titulo: resolverTituloConstruccion }
      },
      ...redirectsPendientes,
      {
        // Ruta desconocida dentro de /app: página genérica de construcción.
        path: '**',
        redirectTo: 'en-construccion/desconocido'
      }
    ]
  },
  {
    path: 'sin-acceso',
    loadComponent: () =>
      import('./shared/sin-acceso.component')
        .then(m => m.SinAccesoComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
