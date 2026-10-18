import { Routes } from '@angular/router';

import { UnidadListaComponent } from './pages/unidad-lista/unidad-lista.component';

export const UNIDAD_MEDIDA_ROUTES: Routes = [
  {
    // Lectura para todos los roles autenticados (el padre /app ya exige
    // sesión). La escritura se controla en la interfaz con *siRol.
    path: '',
    component: UnidadListaComponent
  }
];
