import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { LoteMpListaComponent } from './pages/lote-mp-lista/lote-mp-lista.component';
import { LoteMpFormularioComponent } from './pages/lote-mp-formulario/lote-mp-formulario.component';

const ROLES_LECTURA = ['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'] as const;
const ROLES_ESCRITURA = ['ADMIN', 'PRODUCCION', 'COMPRAS'] as const;

export const LOTE_ROUTES: Routes = [
  {
    path: '',
    component: LoteMpListaComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  },
  {
    path: 'nueva',
    component: LoteMpFormularioComponent,
    canActivate: [rolGuard([...ROLES_ESCRITURA])]
  }
];
