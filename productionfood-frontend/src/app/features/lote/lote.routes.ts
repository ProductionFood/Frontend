import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { LoteMpFormularioComponent } from './pages/lote-mp-formulario/lote-mp-formulario.component';
import { LoteMpListaComponent } from './pages/lote-mp-lista/lote-mp-lista.component';

export const LOTE_ROUTES: Routes = [
  {
    path: '',
    component: LoteMpListaComponent,
    canActivate: [rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'])]
  },
  {
    path: 'nuevo',
    component: LoteMpFormularioComponent,
    canActivate: [rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS'])]
  }
];
