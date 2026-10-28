import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { UnidadListaComponent } from './pages/unidad-lista/unidad-lista.component';
import { UnidadFormularioComponent } from './pages/unidad-formulario/unidad-formulario.component';

const ROLES_LECTURA = ['ADMIN', 'PRODUCCION', 'COMPRAS', 'VENTAS', 'CONSULTA'] as const;
const ROLES_ESCRITURA = ['ADMIN'] as const;

export const UNIDAD_MEDIDA_ROUTES: Routes = [
  {
    path: '',
    component: UnidadListaComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  },
  {
    path: 'nueva',
    component: UnidadFormularioComponent,
    canActivate: [rolGuard([...ROLES_ESCRITURA])]
  },
  {
    path: ':id',
    component: UnidadFormularioComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  }
];
