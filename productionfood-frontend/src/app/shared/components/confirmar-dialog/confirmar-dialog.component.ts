import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmarDialogData {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Pinta la acción de confirmar como destructiva (rojo). */
  peligro?: boolean;
}

/**
 * Diálogo de confirmación reutilizable. Cierra con `true` si se confirma y
 * con `false` si se cancela.
 */
@Component({
  selector: 'app-confirmar-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './confirmar-dialog.component.html',
  styleUrl: './confirmar-dialog.component.scss'
})
export class ConfirmarDialogComponent {
  readonly datos = inject<ConfirmarDialogData>(MAT_DIALOG_DATA);

  private readonly ref =
    inject<MatDialogRef<ConfirmarDialogComponent>>(MatDialogRef);

  confirmar(): void {
    this.ref.close(true);
  }

  cancelar(): void {
    this.ref.close(false);
  }
}
