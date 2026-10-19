import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import {
  Subscription,
  fromEvent,
  merge,
  startWith,
  switchMap,
  throttleTime,
  timer
} from 'rxjs';

import { AuthService } from './auth.service';
import { NotificacionService } from '../ui/notificacion.service';

/** Cierre por inactividad: 1 hora sin actividad. */
const INACTIVIDAD_MS = 60 * 60 * 1000;

/** Aviso previo a la expiración del JWT. */
const AVISO_EXPIRACION_MS = 60 * 1000;

/** Duración visible del aviso. */
const DURACION_AVISO_MS = 10 * 1000;

type MotivoCierre = 'inactividad' | 'expiracion';

/**
 * Cierra la sesión por inactividad o por expiración del token.
 *
 * - Inactividad: 1 hora sin `mousemove`, `mousedown`, `keydown`, `touchstart`
 *   ni `scroll`.
 * - Expiración: avisa 60 s antes del `exp` del JWT y cierra al vencer.
 *
 * No hay refresh token en este alcance, así que el aviso es informativo: la
 * sesión no se puede extender sin volver a iniciar sesión.
 */
@Injectable({ providedIn: 'root' })
export class SesionTiempoService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  private suscripciones = new Subscription();

  /** Arranca (o reinicia) los temporizadores de la sesión actual. */
  iniciar(): void {
    this.detener();

    const actividad$ = merge(
      fromEvent(window, 'mousemove'),
      fromEvent(window, 'mousedown'),
      fromEvent(window, 'keydown'),
      fromEvent(window, 'touchstart'),
      fromEvent(window, 'scroll', { passive: true })
    ).pipe(throttleTime(1000));

    this.suscripciones.add(
      actividad$
        .pipe(
          startWith(null),
          switchMap(() => timer(INACTIVIDAD_MS))
        )
        .subscribe(() => this.cerrar('inactividad'))
    );

    const expiracionMs = this.authService.expiracionTokenMs();

    if (!expiracionMs) {
      return;
    }

    const restante = expiracionMs - Date.now();

    if (restante <= 0) {
      this.cerrar('expiracion');
      return;
    }

    this.suscripciones.add(
      timer(Math.max(0, restante - AVISO_EXPIRACION_MS)).subscribe(() =>
        this.avisarExpiracion()
      )
    );

    this.suscripciones.add(
      timer(restante).subscribe(() => this.cerrar('expiracion'))
    );
  }

  detener(): void {
    this.suscripciones.unsubscribe();
    this.suscripciones = new Subscription();
  }

  private avisarExpiracion(): void {
    this.notificacion.advertenciaAccion(
      'Tu sesión expirará en 1 minuto.',
      'Cerrar sesión',
      DURACION_AVISO_MS,
      () => this.authService.logout()
    );
  }

  private cerrar(motivo: MotivoCierre): void {
    this.detener();
    this.authService.logout(false);

    void this.router.navigate(['/login'], {
      queryParams: {
        sesionExpirada: 'true',
        motivo
      }
    });
  }
}
