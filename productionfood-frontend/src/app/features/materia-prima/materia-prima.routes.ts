import { Routes } from '@angular/router';

import { rolGuard } from '../../core/auth/rol.guard';
import { MateriaPrimaFormularioComponent } from './pages/materia-prima-formulario/materia-prima-formulario.component';
import { MateriaPrimaListaComponent } from './pages/materia-prima-lista/materia-prima-lista.component';

export const MATERIA_PRIMA_ROUTES: Routes = [
  {
    // Lectura amplia; la escritura se controla con *siRol="['ADMIN']".
    path: '',
    component: MateriaPrimaListaComponent,
    canActivate: [
      rolGuard(['ADMIN', 'PRODUCCION', 'COMPRAS', 'CONSULTA'])
    ]
  },
  {
    path: 'nuevo',
    component: MateriaPrimaFormularioComponent,
    canActivate: [rolGuard(['ADMIN'])]
  },
  {
    path: ':id/editar',
    component: MateriaPrimaFormularioComponent,
    canActivate: [rolGuard(['ADMIN'])]
  }
];
