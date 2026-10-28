import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ClienteListaComponent } from './pages/cliente-lista/cliente-lista.component';
import { ClienteFormularioComponent } from './pages/cliente-formulario/cliente-formulario.component';

const ROLES_LECTURA = ['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'] as const;
const ROLES_ESCRITURA = ['ADMIN', 'VENTAS'] as const;

export const CLIENTE_ROUTES: Routes = [
  {
    path: '',
    component: ClienteListaComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  },
  {
    path: 'nueva',
    component: ClienteFormularioComponent,
    canActivate: [rolGuard([...ROLES_ESCRITURA])]
  },
  {
    path: ':id',
    component: ClienteFormularioComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  }
];
