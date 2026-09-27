import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [() => import('./core/auth/auth.guard').then(m => m.authGuard)],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes') },
      { path: 'clientes', loadChildren: () => import('./features/cliente/cliente.routes') },
      { path: 'usuarios', loadChildren: () => import('./features/usuario/usuario.routes') }
    ]
  },
  { path: 'sin-acceso', loadComponent: () => import('./shared/sin-acceso.component').then(m => m.SinAccesoComponent) },
  { path: '**', redirectTo: '' }
];