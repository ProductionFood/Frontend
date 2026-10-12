import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { BitacoraListaComponent } from './pages/bitacora-lista/bitacora-lista.component';

export const BITACORA_ROUTES: Routes = [
  {
    path: '',
    component: BitacoraListaComponent,
    canActivate: [rolGuard(['ADMIN'])]
  }
];
