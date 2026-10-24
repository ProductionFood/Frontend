import { Routes } from '@angular/router';

export const REPORTE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reporte-inicio/reporte-inicio.component').then(
        m => m.ReporteInicioComponent
      )
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
    redirectTo: ''
  }
];
