import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ProveedorFormularioComponent } from './pages/proveedor-formulario/proveedor-formulario.component';
import { ProveedorListaComponent } from './pages/proveedor-lista/proveedor-lista.component';

export const PROVEEDOR_ROUTES: Routes = [
  {
    path: '',
    component: ProveedorListaComponent,
    canActivate: [rolGuard(['ADMIN', 'COMPRAS', 'CONSULTA'])]
  },
  {
    path: 'nuevo',
    component: ProveedorFormularioComponent,
    canActivate: [rolGuard(['ADMIN', 'COMPRAS'])]
  },
  {
    path: ':id/editar',
    component: ProveedorFormularioComponent,
    canActivate: [rolGuard(['ADMIN', 'COMPRAS'])]
  }
];
