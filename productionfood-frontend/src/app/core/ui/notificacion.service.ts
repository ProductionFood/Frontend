import { Injectable, Injector, inject } from '@angular/core';
import type { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/**
 * Notificaciones tipo snackbar. MatSnackBar se importa bajo demanda: este
 * servicio lo usan el interceptor de errores y el control de sesión, que
 * viven en el bundle inicial, y así Overlay/Button de Material no se cargan
 * hasta que se muestra el primer aviso.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  private readonly injector = inject(Injector);
  private snackBar?: Promise<MatSnackBar>;

  exito(mensaje: string): void {
    this.abrir(mensaje, 'Cerrar', {
      duration: 3500,
      panelClass: ['notificacion-exito']
    });
  }

  error(mensaje: string): void {
    this.abrir(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['notificacion-error']
    });
  }

  advertencia(mensaje: string): void {
    this.abrir(mensaje, 'Cerrar', {
      duration: 4000,
      panelClass: ['notificacion-advertencia']
    });
  }

  /**
   * Aviso con una acción (por ejemplo, "Cerrar sesión" antes de que expire).
   */
  advertenciaAccion(
    mensaje: string,
    textoAccion: string,
    duracionMs: number,
    alAccion: () => void
  ): void {
    this.abrir(
      mensaje,
      textoAccion,
      {
        duration: duracionMs,
        panelClass: ['notificacion-advertencia']
      },
      alAccion
    );
  }

  private abrir(
    mensaje: string,
    accion: string,
    config: MatSnackBarConfig,
    alAccion?: () => void
  ): void {
    void this.obtenerSnackBar().then(snackBar => {
      const ref = snackBar.open(mensaje, accion, {
        horizontalPosition: 'right',
        verticalPosition: 'top',
        ...config
      });

      if (alAccion) {
        ref.onAction().subscribe(() => alAccion());
      }
    });
  }

  private obtenerSnackBar(): Promise<MatSnackBar> {
    this.snackBar ??= import('@angular/material/snack-bar').then(m =>
      this.injector.get(m.MatSnackBar)
    );
    return this.snackBar;
  }
}
