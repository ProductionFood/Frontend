import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { rolGuard } from './core/auth/rol.guard';
import { NAV_GRUPOS } from './layout/nav-items';

/** Módulos con implementación real (no generan placeholder). */
const MODULOS_REALES = ['dashboard', 'usuarios'];

/**
 * Módulos pendientes: todos apuntan a la página "Módulo en construcción",
 * que recibe título, HU, descripción e icono desde `data` (input binding).
 */
const rutasPendientes: Routes = NAV_GRUPOS
  .flatMap(grupo => grupo.items)
  .filter(item => !MODULOS_REALES.includes(item.ruta))
  .map(item => ({
    path: item.ruta,
    loadComponent: () =>
      import('./shared/components/modulo-en-construccion/modulo-en-construccion.component')
        .then(m => m.ModuloEnConstruccionComponent),
    data: {
      titulo: item.titulo,
      hu: item.hu,
      descripcion: item.descripcion,
      icono: item.icono
    }
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
      ...rutasPendientes,
      {
        path: 'usuarios',
        canActivate: [rolGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/usuario/usuario.routes')
            .then(m => m.USUARIO_ROUTES)
      },
      {
        // Ruta desconocida dentro de /app: módulo en construcción, no landing.
        path: '**',
        loadComponent: () =>
          import('./shared/components/modulo-en-construccion/modulo-en-construccion.component')
            .then(m => m.ModuloEnConstruccionComponent),
        data: {
          titulo: 'Módulo',
          descripcion:
            'La ruta solicitada no existe o aún no está habilitada.',
          icono: 'help'
        }
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
