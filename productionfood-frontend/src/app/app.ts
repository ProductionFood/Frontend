import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { SesionTiempoService } from './core/auth/sesion-tiempo.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('productionfood-frontend');

  private readonly authService = inject(AuthService);
  private readonly sesionTiempo = inject(SesionTiempoService);

  constructor() {
    // Arranca/para los temporizadores de sesión según el estado de auth.
    effect(() => {
      if (this.authService.autenticado()) {
        this.sesionTiempo.iniciar();
      } else {
        this.sesionTiempo.detener();
      }
    });
  }
}
