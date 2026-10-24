import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { AlertasStockComponent } from './pages/alertas-stock/alertas-stock.component';
import { InventarioListaComponent } from './pages/inventario-lista/inventario-lista.component';
import { InventarioMovimientosComponent } from './pages/inventario-movimientos/inventario-movimientos.component';
import { SugerenciaCompraComponent } from './pages/sugerencia-compra/sugerencia-compra.component';

const ROLES_CONSULTA = ['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'] as const;

export const INVENTARIO_ROUTES: Routes = [
  { path: '', component: InventarioListaComponent, canActivate: [rolGuard([...ROLES_CONSULTA])] },
  { path: 'alertas', component: AlertasStockComponent, canActivate: [rolGuard([...ROLES_CONSULTA])] },
  { path: 'alertas/sugerencia', component: SugerenciaCompraComponent, canActivate: [rolGuard(['ADMIN', 'COMPRAS'])] },
  { path: ':idMateriaPrima/movimientos', component: InventarioMovimientosComponent, canActivate: [rolGuard([...ROLES_CONSULTA])] }
];
