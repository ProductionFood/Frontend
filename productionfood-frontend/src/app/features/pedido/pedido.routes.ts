import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { PedidoConsultaComponent } from './pages/pedido-consulta/pedido-consulta.component';
import { PedidoDetalleComponent } from './pages/pedido-detalle/pedido-detalle.component';
import { PedidoListaComponent } from './pages/pedido-lista/pedido-lista.component';
import { PedidoFormularioComponent } from './pages/pedido-formulario/pedido-formulario.component';

const ROLES_CONSULTA = ['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'] as const;
const ROLES_ESCRITURA = ['ADMIN', 'VENTAS'] as const;
const ROLES_LECTURA = ROLES_CONSULTA;

export const PEDIDO_ROUTES: Routes = [
  {
    // Lectura amplia; la escritura se controla con *siRol="['ADMIN','VENTAS']".
    path: '',
    component: PedidoListaComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  },
  {
    // Antes de ':id' para que "consulta", "nueva" y "editar" no se interpreten como un id.
    path: 'consulta',
    component: PedidoConsultaComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  },
  {
    path: 'nueva',
    component: PedidoFormularioComponent,
    canActivate: [rolGuard([...ROLES_ESCRITURA])]
  },
  {
    path: 'editar/:id',
    component: PedidoFormularioComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  },
  {
    path: ':id',
    component: PedidoDetalleComponent,
    canActivate: [rolGuard([...ROLES_CONSULTA])]
  }
];
