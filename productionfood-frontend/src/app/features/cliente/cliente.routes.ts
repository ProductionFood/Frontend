import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ClienteFormularioComponent } from './pages/cliente-formulario/cliente-formulario.component';
import { ClienteListaComponent } from './pages/cliente-lista/cliente-lista.component';

export const CLIENTE_ROUTES: Routes = [
  {
    path: '',
    component: ClienteListaComponent,
    canActivate: [rolGuard(['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'])]
  },
  {
    path: 'nuevo',
    component: ClienteFormularioComponent,
    canActivate: [rolGuard(['ADMIN', 'VENTAS'])]
  },
  {
    path: ':id/editar',
    component: ClienteFormularioComponent,
    canActivate: [rolGuard(['ADMIN', 'VENTAS'])]
  }
];
