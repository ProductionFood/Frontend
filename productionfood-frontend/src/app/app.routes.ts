import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component')
        .then(m => m.LandingComponent)
  },

  {
    path: 'usuarios',
    loadChildren: () =>
      import('./features/usuario/usuario.routes')
        .then(m => m.USUARIO_ROUTES)
  },

  // TODO: reactivar cuando existan los componentes correspondientes
  // {
  //   path: 'login',
  //   loadComponent: () =>
  //     import('./features/auth/login.component')
  //       .then(m => m.LoginComponent)
  // },

  { 
    path: '**', 
    redirectTo: '' 
  }
];