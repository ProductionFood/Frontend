import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import {
  DetalleCompraListaResponse,
  DetalleCompraResponse
} from '../../models/detalle-compra.model';
import { DetalleCompraService } from '../../services/detalle-compra.service';
import { AgregarItemDialogComponent } from '../agregar-item-dialog/agregar-item-dialog.component';

interface CuerpoError {
  code?: string;
  message?: string;
}

interface ControlesEdicion {
  cantidad: FormControl<number | null>;
  precioUnitario: FormControl<number | null>;
}

/**
 * Tabla de ítems de una compra (HU-14). Edición en línea de cantidad y
 * precio con guardado inmediato, alta por diálogo y baja con confirmación.
 * El total del pie es el que devuelve el backend (R-03); la columna
 * «vs. REF.» compara con el costo de referencia de HU-08 (R-04). Cuando la
 * compra ya no es editable se ocultan los controles, no se deshabilitan
 * (R-01).
 */
@Component({
  selector: 'app-detalle-compra-tabla',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    SiRolDirective
  ],
  templateUrl: './detalle-compra-tabla.component.html',
  styleUrl: './detalle-compra-tabla.component.scss'
})
export class DetalleCompraTablaComponent {
  readonly idCompra = input.required<number>();
  readonly lista = input<DetalleCompraListaResponse | null>(null);
  readonly cargando = input(false);

  /** Pide a la página padre recargar la compra y su detalle. */
  readonly recargar = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly detalleService = inject(DetalleCompraService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly editandoId = signal<number | null>(null);
  readonly formEdicion = signal<FormGroup<ControlesEdicion> | null>(null);
  readonly guardandoId = signal<number | null>(null);
  readonly errorEdicion = signal<string | null>(null);

  readonly columnas = computed(() => {
    const columnas = ['materiaPrima', 'cantidad', 'precioUnitario'];

    if (this.lista()?.editable) {
      columnas.push('diferenciaCosto');
    }

    columnas.push('subtotal');

    if (this.lista()?.editable) {
      columnas.push('acciones');
    }

    return columnas;
  });

  readonly idsExcluidos = computed(
    () =>
      this.lista()?.detalles.map(
        detalle => detalle.materiaPrima.idMateriaPrima
      ) ?? []
  );

  agregarItem(): void {
    this.dialog
      .open(AgregarItemDialogComponent, {
        data: {
          idCompra: this.idCompra(),
          idsExcluidos: this.idsExcluidos()
        },
        width: '520px',
        maxWidth: '95vw',
        autoFocus: 'dialog',
        disableClose: true
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(guardado => {
        if (guardado === true) {
          this.notificacion.exito('Ítem agregado a la compra.');
          this.recargar.emit();
        }
      });
  }

  editar(linea: DetalleCompraResponse): void {
    this.errorEdicion.set(null);
    this.editandoId.set(linea.idDetalleCompra);
    this.formEdicion.set(
      new FormGroup<ControlesEdicion>({
        cantidad: this.fb.control<number | null>(linea.cantidad, {
          validators: [
            Validators.required,
            Validators.min(0.0001),
            Validators.max(99999999.99)
          ]
        }),
        precioUnitario: this.fb.control<number | null>(linea.precioUnitario, {
          validators: [
            Validators.required,
            Validators.min(0),
            Validators.max(99999999.99)
          ]
        })
      })
    );
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.formEdicion.set(null);
    this.errorEdicion.set(null);
  }

  guardarEdicion(linea: DetalleCompraResponse): void {
    const form = this.formEdicion();

    if (!form) {
      return;
    }

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const { cantidad, precioUnitario } = form.getRawValue();

    if (cantidad === null || precioUnitario === null) {
      return;
    }

    this.guardandoId.set(linea.idDetalleCompra);
    this.errorEdicion.set(null);

    this.detalleService
      .actualizar(this.idCompra(), linea.idDetalleCompra, {
        cantidad: Number(cantidad.toFixed(2)),
        precioUnitario: Number(precioUnitario.toFixed(2))
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificacion.exito('Ítem actualizado.');
          this.cancelarEdicion();
          this.recargar.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.guardandoId.set(null);

          if (error.status === 409) {
            this.notificacion.advertencia(
              this.mensajeError(
                error,
                'La compra ya no se puede editar.'
              )
            );
            this.cancelarEdicion();
            this.recargar.emit();
            return;
          }

          this.errorEdicion.set(
            this.mensajeError(error, 'No se pudo guardar el cambio.')
          );
          this.aplicarErroresDeCampo(form, error);
        }
      });
  }

  eliminar(linea: DetalleCompraResponse): void {
    const data: ConfirmarDialogData = {
      titulo: 'Quitar ítem',
      mensaje:
        `¿Quitar «${linea.materiaPrima.nombre}» de esta compra? ` +
        'Podrás volver a agregarlo mientras la compra siga pendiente.',
      textoConfirmar: 'Quitar ítem',
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

        this.detalleService
          .eliminar(this.idCompra(), linea.idDetalleCompra)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.notificacion.exito('Ítem quitado de la compra.');
              this.recargar.emit();
            },
            error: (error: HttpErrorResponse) => {
              if (error.status === 409) {
                this.notificacion.advertencia(
                  this.mensajeError(
                    error,
                    'La compra ya no se puede editar.'
                  )
                );
                this.recargar.emit();
                return;
              }

              this.notificacion.error(
                this.mensajeError(error, 'No se pudo quitar el ítem.')
              );
            }
          });
      });
  }

  private aplicarErroresDeCampo(
    form: FormGroup<ControlesEdicion>,
    error: HttpErrorResponse
  ): void {
    const body: unknown = error.error;

    if (body === null || typeof body !== 'object') {
      return;
    }

    const apiError = body as { fieldErrors?: unknown };

    if (!Array.isArray(apiError.fieldErrors)) {
      return;
    }

    for (const fieldError of apiError.fieldErrors) {
      if (
        fieldError === null ||
        typeof fieldError !== 'object' ||
        typeof (fieldError as { field?: unknown }).field !== 'string' ||
        typeof (fieldError as { message?: unknown }).message !== 'string'
      ) {
        continue;
      }

      const { field, message } = fieldError as { field: string; message: string };
      const control = form.get(field);

      if (!control) {
        continue;
      }

      control.setErrors({
        ...(control.errors ?? {}),
        servidor: message
      });
      control.markAsTouched();
    }
  }

  private mensajeError(error: HttpErrorResponse, respaldo: string): string {
    const cuerpo = (error.error ?? null) as CuerpoError | null;

    if (cuerpo && typeof cuerpo.message === 'string' && cuerpo.message.length > 0) {
      return cuerpo.message;
    }

    return respaldo;
  }
}
