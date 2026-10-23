import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { CompraListaComponent } from './pages/compra-lista/compra-lista.component';

const ROLES_CONSULTA = ['ADMIN', 'COMPRAS', 'PRODUCCION', 'CONSULTA'] as const;

export const COMPRA_ROUTES: Routes = [
  {
    // Lectura amplia; la escritura se controla con *siRol="['ADMIN','COMPRAS']".
    path: '',
    component: CompraListaComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  }
];
