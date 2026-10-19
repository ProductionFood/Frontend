import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  private readonly snackBar = inject(MatSnackBar);

  exito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['notificacion-exito']
    });
  }

  error(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['notificacion-error']
    });
  }

  advertencia(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
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
    this.snackBar
      .open(mensaje, textoAccion, {
        duration: duracionMs,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['notificacion-advertencia']
      })
      .onAction()
      .subscribe(() => alAccion());
  }
}