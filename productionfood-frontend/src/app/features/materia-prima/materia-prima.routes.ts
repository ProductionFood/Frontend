import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { MateriaPrimaListaComponent } from './pages/materia-prima-lista/materia-prima-lista.component';
import { MateriaPrimaFormularioComponent } from './pages/materia-prima-formulario/materia-prima-formulario.component';

const ROLES_LECTURA = ['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'] as const;
const ROLES_ESCRITURA = ['ADMIN', 'PRODUCCION'] as const;

export const MATERIA_PRIMA_ROUTES: Routes = [
  {
    path: '',
    component: MateriaPrimaListaComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  },
  {
    path: 'nueva',
    component: MateriaPrimaFormularioComponent,
    canActivate: [rolGuard([...ROLES_ESCRITURA])]
  },
  {
    path: ':id',
    component: MateriaPrimaFormularioComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  }
];
