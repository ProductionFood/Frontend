import { Routes } from '@angular/router';

import { UsuarioFormularioComponent } from './pages/usuario-formulario/usuario-formulario.component';

export const USUARIO_ROUTES: Routes = [
  {
    // /app/usuarios sin subruta: enviar al formulario (única pantalla real
    // por ahora). Evita el router-outlet vacío (pantalla en blanco).
    path: '',
    redirectTo: 'nuevo',
    pathMatch: 'full'
  },
  {
    path: 'nuevo',
    component: UsuarioFormularioComponent
  }
];
