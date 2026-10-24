import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { PedidoConsultaComponent } from './pages/pedido-consulta/pedido-consulta.component';
import { PedidoDetalleComponent } from './pages/pedido-detalle/pedido-detalle.component';
import { PedidoListaComponent } from './pages/pedido-lista/pedido-lista.component';

const ROLES_CONSULTA = ['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'] as const;

export const PEDIDO_ROUTES: Routes = [
  {
    // Lectura amplia; la escritura se controla con *siRol="['ADMIN','VENTAS']".
    path: '',
    component: PedidoListaComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  },
  {
    // Antes de ':id' para que "consulta" no se interprete como un id.
    path: 'consulta',
    component: PedidoConsultaComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  },
  {
    path: ':id',
    component: PedidoDetalleComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  }
];
