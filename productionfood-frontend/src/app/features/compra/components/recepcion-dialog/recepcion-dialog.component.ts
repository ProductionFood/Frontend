import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Compra, LineaCompra, MovimientoGenerado } from '../../models/compra.model';
import { CompraService } from '../../services/compra.service';

export interface RecepcionDialogData {
  compra: Compra;
}

interface CuerpoError {
  code?: string;
  message?: string;
}

/**
 * Diálogo de recepción de una compra (HU-13, la pantalla más importante de
 * la historia). Antes de confirmar muestra, línea por línea, el efecto que
 * tendrá sobre el inventario y advierte que la acción es irreversible
 * (R-02). Tras confirmar, muestra los saldos resultantes que devuelve el
 * backend.
 */
@Component({
  selector: 'app-recepcion-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  templateUrl: './recepcion-dialog.component.html',
  styleUrl: './recepcion-dialog.component.scss'
})
export class RecepcionDialogComponent {
  private readonly compraService = inject(CompraService);
  private readonly destroyRef = inject(DestroyRef);

  readonly datos = inject<RecepcionDialogData>(MAT_DIALOG_DATA);

  private readonly ref =
    inject<MatDialogRef<RecepcionDialogComponent>>(MatDialogRef);

  readonly compra = this.datos.compra;
  readonly lineas = this.compra.detalle ?? [];

  readonly recibiendo = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly resultado = signal<MovimientoGenerado[] | null>(null);

  readonly columnasImpacto = ['materiaPrima', 'cantidad', 'impacto'];
  readonly columnasResultado = [
    'materiaPrima',
    'cantidad',
    'saldoAnterior',
    'saldoPosterior'
  ];

  confirmar(): void {
    if (this.recibiendo()) {
      return;
    }

    this.recibiendo.set(true);
    this.errorGeneral.set(null);

    this.compraService
      .cambiarEstado(this.compra.idCompra, 'RECIBIDA')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta =>
          this.resultado.set(respuesta.movimientosGenerados),
        error: (error: HttpErrorResponse) => {
          this.recibiendo.set(false);
          this.errorGeneral.set(this.mensajeError(error));
        }
      });
  }

  cancelar(): void {
    if (this.recibiendo()) {
      return;
    }

    this.ref.close(this.resultado() !== null);
  }

  /** Stock resultante tras recibir, o `null` si el backend no lo informa. */
  saldoPosterior(linea: LineaCompra): number | null {
    return linea.stockActual === undefined
      ? null
      : linea.stockActual + linea.cantidad;
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = (error.error ?? null) as CuerpoError | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo recibir la compra.';
  }
}
