import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ProveedorListaComponent } from './pages/proveedor-lista/proveedor-lista.component';

export const PROVEEDOR_ROUTES: Routes = [
  {
    path: '',
    component: ProveedorListaComponent,
    canActivate: [rolGuard(['ADMIN', 'COMPRAS', 'CONSULTA'])]
  }
];
