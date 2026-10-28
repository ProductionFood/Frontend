import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ProveedorListaComponent } from './pages/proveedor-lista/proveedor-lista.component';
import { ProveedorFormularioComponent } from './pages/proveedor-formulario/proveedor-formulario.component';

const ROLES_LECTURA = ['ADMIN', 'COMPRAS', 'CONSULTA'] as const;
const ROLES_ESCRITURA = ['ADMIN', 'COMPRAS'] as const;

export const PROVEEDOR_ROUTES: Routes = [
  {
    path: '',
    component: ProveedorListaComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  },
  {
    path: 'nueva',
    component: ProveedorFormularioComponent,
    canActivate: [rolGuard([...ROLES_ESCRITURA])]
  },
  {
    path: ':id',
    component: ProveedorFormularioComponent,
    canActivate: [rolGuard([...ROLES_LECTURA])]
  }
];
