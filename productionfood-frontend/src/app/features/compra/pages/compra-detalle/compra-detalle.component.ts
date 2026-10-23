import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { Compra } from '../../models/compra.model';
import { CompraService } from '../../services/compra.service';
import { RecepcionDialogComponent } from '../../components/recepcion-dialog/recepcion-dialog.component';

/**
 * Detalle de una compra (HU-13): cabecera con estado, tabla de líneas en
 * solo lectura (HU-14 hará el CRUD) y acciones de estado. Recibir abre el
 * diálogo de recepción que muestra el impacto sobre el inventario antes de
 * confirmar; Cancelar pide confirmación. Ambas acciones desaparecen cuando
 * la compra ya no es editable (R-04).
 */
@Component({
  selector: 'app-compra-detalle',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    SiRolDirective
  ],
  templateUrl: './compra-detalle.component.html',
  styleUrl: './compra-detalle.component.scss'
})
export class CompraDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly compraService = inject(CompraService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly idCompra = Number(this.route.snapshot.paramMap.get('id'));

  readonly compra = signal<Compra | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly columnasLineas = [
    'materiaPrima',
    'cantidad',
    'precioUnitario',
    'subtotal'
  ];

  readonly lineas = computed(() => this.compra()?.detalle ?? []);

  readonly totalLineas = computed(() =>
    this.lineas().reduce((suma, linea) => suma + linea.subtotal, 0)
  );

  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.compraService.obtener(this.idCompra).pipe(
            catchError((error: HttpErrorResponse) => {
              this.compra.set(null);
              this.error.set(this.mensajeError(error));
              this.cargando.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(compra => {
        this.compra.set(compra);
        this.cargando.set(false);
        this.error.set(null);
      });

    this.recargar();
  }

  recargar(): void {
    this.recargar$.next();
  }

  get titulo(): string {
    return `Compra #${this.idCompra}`;
  }

  recibir(): void {
    const compra = this.compra();

    if (!compra || !compra.editable || compra.estado !== 'PENDIENTE') {
      return;
    }

    this.dialog
      .open(RecepcionDialogComponent, {
        data: { compra },
        width: '640px',
        maxWidth: '95vw',
        autoFocus: 'dialog',
        disableClose: true
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(resultado => {
        if (resultado === true) {
          this.notificacion.exito(
            'Compra recibida. El inventario fue actualizado.'
          );
          this.recargar();
        }
      });
  }

  cancelarCompra(): void {
    const compra = this.compra();

    if (!compra || !compra.editable || compra.estado !== 'PENDIENTE') {
      return;
    }

    const data: ConfirmarDialogData = {
      titulo: 'Cancelar compra',
      mensaje:
        `¿Cancelar la compra #${compra.idCompra} a «${compra.proveedor.nombre}»? ` +
        'Todavía no ha recibido stock, así que cancelarla no afecta el inventario. ' +
        'Esta acción no se puede deshacer.',
      textoConfirmar: 'Cancelar compra',
      peligro: true
    };

    this.dialog
      .open(ConfirmarDialogComponent, {
        data,
        width: '460px',
        autoFocus: 'dialog'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (!confirmado) {
          return;
        }

        this.compraService
          .cambiarEstado(compra.idCompra, 'CANCELADA')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notificacion.exito('Compra cancelada.');
              this.recargar();
            },
            error: (error: HttpErrorResponse) => {
              if (error.status === 409) {
                this.notificacion.advertencia(this.mensajeError(error));
                return;
              }
              this.notificacion.error(this.mensajeError(error));
            }
          });
      });
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as { message?: string } | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cargar la compra.';
  }
}
