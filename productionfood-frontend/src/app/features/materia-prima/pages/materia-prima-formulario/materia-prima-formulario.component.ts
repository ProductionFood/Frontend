import { Component, DestroyRef, inject, signal } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { Router } from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { UnidadMedida } from '../../../unidad-medida/models/unidad-medida.model';
import { UnidadMedidaService } from '../../../unidad-medida/services/unidad-medida.service';
import {
  CrearMateriaPrimaDto,
  MateriaPrima
} from '../../models/materia-prima.model';
import { MateriaPrimaService } from '../../services/materia-prima.service';

export interface MateriaPrimaFormularioData {
  materia?: MateriaPrima;
}

interface CuerpoError {
  code?: string;
  message?: string;
  fieldErrors?: { field: string; message: string }[];
}

/** R-02: máximo dos decimales, sin recurrir a aritmética binaria. */
function maxDosDecimales(
  control: AbstractControl
): ValidationErrors | null {
  const valor = control.value;

  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return { numeroInvalido: true };
  }

  return Math.round(numero * 100) === numero * 100
    ? null
    : { decimales: true };
}

/**
 * Formulario de materia prima (HU-08) en `MatDialog`, para crear y editar.
 * El selector de unidad usa el catálogo cacheado de HU-07 y muestra
 * "Nombre (abreviatura)"; los números llevan el sufijo de la unidad elegida.
 */
@Component({
  selector: 'app-materia-prima-formulario',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './materia-prima-formulario.component.html',
  styleUrl: './materia-prima-formulario.component.scss'
})
export class MateriaPrimaFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly materiaPrimaService = inject(MateriaPrimaService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly datos = inject<MateriaPrimaFormularioData>(MAT_DIALOG_DATA);

  private readonly ref =
    inject<MatDialogRef<MateriaPrimaFormularioComponent>>(MatDialogRef);

  readonly esEdicion = !!this.datos.materia;
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly unidades = signal<UnidadMedida[]>([]);
  readonly cargandoUnidades = signal(true);
  readonly errorUnidades = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control(
      this.datos.materia?.nombre ?? '',
      [Validators.required, Validators.maxLength(100)]
    ),
    idUnidad: this.fb.control<number | null>(
      this.datos.materia?.unidad.idUnidad ?? null,
      [Validators.required]
    ),
    stockMinimo: this.fb.control<number | null>(
      this.datos.materia?.stockMinimo ?? null,
      [Validators.required, Validators.min(0), maxDosDecimales]
    ),
    costoUnitario: this.fb.control<number | null>(
      this.datos.materia?.costoUnitario ?? null,
      [Validators.required, Validators.min(0), maxDosDecimales]
    )
  });

  constructor() {
    this.cargarUnidades();
  }

  get sinUnidades(): boolean {
    return !this.cargandoUnidades() && this.unidades().length === 0;
  }

  get unidadAbreviatura(): string {
    const id = this.form.controls.idUnidad.value;
    return (
      this.unidades().find(unidad => unidad.idUnidad === id)?.abreviatura ?? ''
    );
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();

    if (
      valor.idUnidad === null ||
      valor.stockMinimo === null ||
      valor.costoUnitario === null
    ) {
      return;
    }

    const dto: CrearMateriaPrimaDto = {
      nombre: valor.nombre.trim(),
      idUnidad: valor.idUnidad,
      stockMinimo: Number(valor.stockMinimo),
      costoUnitario: Number(valor.costoUnitario)
    };

    this.guardando.set(true);
    this.errorGeneral.set(null);

    const peticion = this.datos.materia
      ? this.materiaPrimaService.actualizar(
          this.datos.materia.idMateriaPrima,
          dto
        )
      : this.materiaPrimaService.crear(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.ref.close(true),
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  cancelar(): void {
    if (this.guardando()) {
      return;
    }

    if (!this.form.dirty) {
      this.ref.close(false);
      return;
    }

    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje:
        'Tienes cambios sin guardar. ¿Quieres cerrar el formulario y descartarlos?',
      textoConfirmar: 'Descartar cambios',
      textoCancelar: 'Seguir editando',
      peligro: true
    };

    this.dialog
      .open(ConfirmarDialogComponent, {
        data,
        width: '420px',
        autoFocus: 'dialog'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.ref.close(false);
        }
      });
  }

  irAUnidades(): void {
    this.ref.close(false);
    void this.router.navigate(['/app/unidades-medida']);
  }

  get nombreError(): string {
    const control = this.form.controls.nombre;

    if (control.hasError('required')) {
      return 'El nombre es obligatorio';
    }

    if (control.hasError('maxlength')) {
      return 'Máximo 100 caracteres';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  get unidadError(): string {
    const control = this.form.controls.idUnidad;

    if (control.hasError('required')) {
      return 'Seleccione una unidad de medida';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  get stockError(): string {
    const control = this.form.controls.stockMinimo;

    if (control.hasError('required')) {
      return 'El stock mínimo es obligatorio';
    }

    if (control.hasError('min')) {
      return 'Debe ser 0 o mayor';
    }

    if (control.hasError('decimales')) {
      return 'Máximo 2 decimales';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  get costoError(): string {
    const control = this.form.controls.costoUnitario;

    if (control.hasError('required')) {
      return 'El costo unitario es obligatorio';
    }

    if (control.hasError('min')) {
      return 'Debe ser 0 o mayor';
    }

    if (control.hasError('decimales')) {
      return 'Máximo 2 decimales';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  private cargarUnidades(): void {
    this.unidadService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: unidades => {
          this.unidades.set(unidades);
          this.cargandoUnidades.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.cargandoUnidades.set(false);
          this.errorUnidades.set(
            this.mensajeError(error) ??
              'No se pudo cargar el catálogo de unidades.'
          );
        }
      });
  }

  private aplicarError(error: HttpErrorResponse): void {
    const cuerpo = (error.error ?? null) as CuerpoError | null;

    if (!cuerpo) {
      this.errorGeneral.set('No se pudo guardar la materia prima.');
      return;
    }

    if (cuerpo.code === 'UNIDAD_INEXISTENTE') {
      this.form.controls.idUnidad.setErrors({
        servidor: cuerpo.message ?? 'La unidad seleccionada no existe.'
      });
      this.form.controls.idUnidad.markAsTouched();
      return;
    }

    if (cuerpo.fieldErrors?.length) {
      for (const fieldError of cuerpo.fieldErrors) {
        const control = this.form.get(fieldError.field);

        if (control) {
          control.setErrors({ servidor: fieldError.message });
          control.markAsTouched();
        }
      }
      return;
    }

    this.errorGeneral.set(
      cuerpo.message ?? 'No se pudo guardar la materia prima.'
    );
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = error.error as { message?: string } | null;

    return cuerpo && typeof cuerpo.message === 'string'
      ? cuerpo.message
      : null;
  }
}
