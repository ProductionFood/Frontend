import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { MateriaPrimaListaComponent } from './pages/materia-prima-lista/materia-prima-lista.component';

export const MATERIA_PRIMA_ROUTES: Routes = [
  {
    // Lectura amplia; la escritura se controla con *siRol="['ADMIN']".
    path: '',
    component: MateriaPrimaListaComponent,
    canActivate: [
      rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'])
    ]
  }
];
