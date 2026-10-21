import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { InventarioListaComponent } from './pages/inventario-lista/inventario-lista.component';
import { InventarioMovimientosComponent } from './pages/inventario-movimientos/inventario-movimientos.component';

const ROLES_CONSULTA = ['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'] as const;

export const INVENTARIO_ROUTES: Routes = [
  { path: '', component: InventarioListaComponent, canActivate: [rolGuard([...ROLES_CONSULTA])] },
  { path: ':idMateriaPrima/movimientos', component: InventarioMovimientosComponent, canActivate: [rolGuard([...ROLES_CONSULTA])] }
];
