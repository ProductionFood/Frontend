import { Routes } from '@angular/router';
import { rolGuard } from '../../core/auth/rol.guard';
import { ClienteListaComponent } from './pages/cliente-lista/cliente-lista.component';

export const CLIENTE_ROUTES: Routes = [
  {
    path: '',
    component: ClienteListaComponent,
    canActivate: [rolGuard(['ADMIN', 'VENTAS', 'PRODUCCION', 'CONSULTA'])]
  }
];
