import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { rolGuard } from './core/auth/rol.guard';

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
        path: 'pedidos',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'produccion',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'compras',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'usuarios',
        canActivate: [rolGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/usuario/usuario.routes')
            .then(m => m.USUARIO_ROUTES)
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
