import { Routes } from '@angular/router';

export const REPORTE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'eficiencia'
  },
  {
    path: 'eficiencia',
    loadComponent: () =>
      import('./pages/eficiencia-reporte/eficiencia-reporte.component').then(
        m => m.EficienciaReporteComponent
      )
  },
  {
    path: '**',
    redirectTo: 'eficiencia'
  }
];
