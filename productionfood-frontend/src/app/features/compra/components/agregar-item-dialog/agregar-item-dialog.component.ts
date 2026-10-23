import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ApiError } from '../../../../shared/models/api-error.model';
import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { MateriaPrimaService } from '../../../materia-prima/services/materia-prima.service';
import { DetalleCompraService } from '../../services/detalle-compra.service';

export interface AgregarItemDialogData {
  idCompra: number;
  /** Materia primas ya presentes en la compra: el selector las excluye (R-02). */
  idsExcluidos: number[];
}

/**
 * Agrega un ítem al detalle de una compra (HU-14). El selector excluye las
 * materias primas que ya están en la compra (R-02), el precio viene
 * prellenado con el costo de referencia de HU-08 y es editable (R-04), y el
 * subtotal se previsualiza mientras se escribe sin reemplazar al total del
 * backend (R-03).
 */
@Component({
  selector: 'app-agregar-item-dialog',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './agregar-item-dialog.component.html',
  styleUrl: './agregar-item-dialog.component.scss'
})
export class AgregarItemDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly materiasService = inject(MateriaPrimaService);
  private readonly detalleService = inject(DetalleCompraService);
  private readonly destroyRef = inject(DestroyRef);

  readonly datos = inject<AgregarItemDialogData>(MAT_DIALOG_DATA);

  private readonly ref =
    inject<MatDialogRef<AgregarItemDialogComponent>>(MatDialogRef);

  readonly cargandoMaterias = signal(true);
  readonly errorMaterias = signal<string | null>(null);
  readonly enviando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly materias = signal<MateriaPrima[]>([]);

  readonly form = this.fb.nonNullable.group({
    idMateriaPrima: this.fb.control<number | null>(null, {
      validators: [Validators.required]
    }),
    cantidad: this.fb.control<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(0.0001),
        Validators.max(99999999.99)
      ]
    }),
    precioUnitario: this.fb.control<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(0),
        Validators.max(99999999.99)
      ]
    })
  });

  readonly materiaSeleccionada = computed(() => {
    const id = this.form.controls.idMateriaPrima.value;

    return this.materias().find(
      materia => materia.idMateriaPrima === id
    );
  });

  /** Previsualización mientras se escribe; la cifra oficial la calcula el backend (R-03). */
  readonly subtotalVista = computed(() => {
    const cantidad = this.form.controls.cantidad.value ?? 0;
    const precio = this.form.controls.precioUnitario.value ?? 0;

    return Number(cantidad) * Number(precio);
  });

  constructor() {
    this.cargarMaterias();

    this.form.controls.idMateriaPrima.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.prefillPrecio());
  }

  cargarMaterias(): void {
    this.cargandoMaterias.set(true);
    this.errorMaterias.set(null);

    this.materiasService
      .listar({
        activo: true,
        page: 0,
        size: 500,
        sort: 'nombre,asc'
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pagina => {
          this.materias.set(
            pagina.content.filter(
              materia =>
                !this.datos.idsExcluidos.includes(materia.idMateriaPrima)
            )
          );
          this.cargandoMaterias.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMaterias.set(
            this.mensajeError(
              error,
              'No se pudieron cargar las materias primas.'
            )
          );
          this.cargandoMaterias.set(false);
        }
      });
  }

  guardar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const { idMateriaPrima, cantidad, precioUnitario } =
      this.form.getRawValue();

    if (idMateriaPrima === null || cantidad === null || precioUnitario === null) {
      return;
    }

    this.enviando.set(true);
    this.errorGeneral.set(null);

    this.detalleService
      .agregar(this.datos.idCompra, {
        idMateriaPrima,
        cantidad: Number(cantidad.toFixed(2)),
        precioUnitario: Number(precioUnitario.toFixed(2))
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error: HttpErrorResponse) => {
          this.enviando.set(false);
          this.errorGeneral.set(this.mensajeError(error, 'No se pudo agregar el ítem.'));
          this.aplicarErroresDeCampo(error);
        }
      });
  }

  cancelar(): void {
    if (this.enviando()) {
      return;
    }

    this.ref.close(false);
  }

  private prefillPrecio(): void {
    const materia = this.materiaSeleccionada();

    if (materia) {
      this.form.controls.precioUnitario.setValue(materia.costoUnitario);
    }
  }

  private aplicarErroresDeCampo(error: HttpErrorResponse): void {
    const body: unknown = error.error;

    if (body === null || typeof body !== 'object') {
      return;
    }

    const apiError = body as Partial<ApiError>;

    if (!Array.isArray(apiError.fieldErrors)) {
      return;
    }

    for (const fieldError of apiError.fieldErrors) {
      if (
        fieldError === null ||
        typeof fieldError !== 'object' ||
        typeof fieldError.field !== 'string' ||
        typeof fieldError.message !== 'string'
      ) {
        continue;
      }

      const control = this.form.get(fieldError.field);

      if (!control) {
        continue;
      }

      control.setErrors({
        ...(control.errors ?? {}),
        servidor: fieldError.message
      });
      control.markAsTouched();
    }
  }

  private mensajeError(error: HttpErrorResponse, respaldo: string): string {
    const body: unknown = error.error;

    if (body !== null && typeof body === 'object') {
      const mensaje = (body as { message?: unknown }).message;

      if (typeof mensaje === 'string' && mensaje.length > 0) {
        return mensaje;
      }
    }

    return respaldo;
  }
}
