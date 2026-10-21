import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { LoteMpListaComponent } from './pages/lote-mp-lista/lote-mp-lista.component';

export const LOTE_ROUTES: Routes = [{
  path: '', component: LoteMpListaComponent,
  canActivate: [rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'])]
}];
