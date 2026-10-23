import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { CompraDetalleComponent } from './pages/compra-detalle/compra-detalle.component';
import { CompraHistorialComponent } from './pages/compra-historial/compra-historial.component';
import { CompraListaComponent } from './pages/compra-lista/compra-lista.component';

const ROLES_CONSULTA = ['ADMIN', 'COMPRAS', 'PRODUCCION', 'CONSULTA'] as const;

export const COMPRA_ROUTES: Routes = [
  {
    // Lectura amplia; la escritura se controla con *siRol="['ADMIN','COMPRAS']".
    path: '',
    component: CompraListaComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  },
  {
    // Antes de ':id' para que "historial" no se interprete como un id.
    path: 'historial',
    component: CompraHistorialComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  },
  {
    path: ':id',
    component: CompraDetalleComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  }
];
