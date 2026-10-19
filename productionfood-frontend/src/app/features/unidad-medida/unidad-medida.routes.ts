import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { UnidadListaComponent } from './pages/unidad-lista/unidad-lista.component';

export const UNIDAD_MEDIDA_ROUTES: Routes = [
  {
    // Lectura para todos los roles autenticados; la escritura se controla
    // en la interfaz con *siRol="['ADMIN']".
    path: '',
    component: UnidadListaComponent,
    canActivate: [
      rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS', 'VENTAS', 'CONSULTA'])
    ]
  }
];
