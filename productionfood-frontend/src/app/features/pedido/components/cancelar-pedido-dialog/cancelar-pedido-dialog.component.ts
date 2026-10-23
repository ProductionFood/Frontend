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

import { LineaPedido, Pedido } from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';

export interface CancelarPedidoDialogData {
  pedido: Pedido;
}

interface CuerpoError {
  code?: string;
  message?: string;
}

/**
 * Diálogo de cancelación de un pedido (HU-16 R-04). A diferencia de una
 * simple confirmación, muestra que cancelar **devuelve stock**: cada línea
 * del detalle vuelve al inventario en los lotes de los que salió. Sin esa
 * información, cancelar parece un cambio de etiqueta.
 */
@Component({
  selector: 'app-cancelar-pedido-dialog',
  standalone: true,
  imports: [
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  templateUrl: './cancelar-pedido-dialog.component.html',
  styleUrl: './cancelar-pedido-dialog.component.scss'
})
export class CancelarPedidoDialogComponent {
  private readonly pedidoService = inject(PedidoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly datos = inject<CancelarPedidoDialogData>(MAT_DIALOG_DATA);

  private readonly ref =
    inject<MatDialogRef<CancelarPedidoDialogComponent>>(MatDialogRef);

  readonly pedido = this.datos.pedido;
  readonly lineas = this.pedido.detalle ?? [];

  readonly cancelando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly columnas = ['producto', 'cantidad', 'lotes'];

  /** Códigos de lote que recibirán el stock de vuelta, o vacío si se desconocen. */
  lotesDeLinea(linea: LineaPedido): string[] {
    return linea.lotesConsumidos?.map(lote => lote.codigoLote) ?? [];
  }

  confirmar(): void {
    if (this.cancelando()) {
      return;
    }

    this.cancelando.set(true);
    this.errorGeneral.set(null);

    this.pedidoService
      .cambiarEstado(this.pedido.idPedido, 'CANCELADO')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error: HttpErrorResponse) => {
          this.cancelando.set(false);
          this.errorGeneral.set(this.mensajeError(error));
        }
      });
  }

  volver(): void {
    if (this.cancelando()) {
      return;
    }

    this.ref.close(false);
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = (error.error ?? null) as CuerpoError | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cancelar el pedido.';
  }
}
