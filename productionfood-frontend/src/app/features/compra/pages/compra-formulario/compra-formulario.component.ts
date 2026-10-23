import { Component, DestroyRef, inject, signal } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
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

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { Proveedor } from '../../../proveedor/models/proveedor.model';
import { ProveedorService } from '../../../proveedor/services/proveedor.service';
import {
  Compra,
  CrearCompraDto
} from '../../models/compra.model';
import { CompraService } from '../../services/compra.service';

export interface CompraFormularioData {
  compra?: Compra;
}

interface CuerpoError {
  code?: string;
  message?: string;
  fieldErrors?: { field: string; message: string }[];
}

/**
 * Formulario de compra (HU-13) en `MatDialog`, para crear y editar la
 * cabecera. El estado no es editable: al crear siempre es `PENDIENTE` y los
 * cambios posteriores pasan por el flujo de estados del detalle (R-02).
 */
@Component({
  selector: 'app-compra-formulario',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './compra-formulario.component.html',
  styleUrl: './compra-formulario.component.scss'
})
export class CompraFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly compraService = inject(CompraService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly datos = inject<CompraFormularioData>(MAT_DIALOG_DATA);

  private readonly ref =
    inject<MatDialogRef<CompraFormularioComponent>>(MatDialogRef);

  readonly esEdicion = !!this.datos.compra;
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly proveedores = signal<Proveedor[]>([]);
  readonly cargandoProveedores = signal(true);
  readonly errorProveedores = signal<string | null>(null);

  /** R-07: la fecha puede ser pasada, pero no futura. */
  readonly maxFecha = new Date();

  readonly form = this.fb.group({
    idProveedor: this.fb.control<number | null>(
      this.datos.compra?.proveedor.idProveedor ?? null,
      [Validators.required]
    ),
    fecha: this.fb.control<Date | null>(
      this.aFecha(this.datos.compra?.fecha),
      [Validators.required]
    )
  });

  constructor() {
    this.cargarProveedores();
  }

  get sinProveedores(): boolean {
    return (
      !this.cargandoProveedores() && this.proveedores().length === 0
    );
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();

    if (valor.idProveedor === null || valor.fecha === null) {
      return;
    }

    const fecha = this.iso(valor.fecha);

    this.guardando.set(true);
    this.errorGeneral.set(null);

    const peticion = this.datos.compra
      ? this.compraService.actualizar(this.datos.compra.idCompra, {
          idProveedor: valor.idProveedor,
          fecha
        })
      : this.compraService.crear({
          idProveedor: valor.idProveedor,
          fecha,
          estado: 'PENDIENTE'
        });

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

  get proveedorError(): string {
    const control = this.form.controls.idProveedor;

    if (control.hasError('required')) {
      return 'Seleccione un proveedor';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  get fechaError(): string {
    const control = this.form.controls.fecha;

    if (control.hasError('required')) {
      return 'La fecha es obligatoria';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  private cargarProveedores(): void {
    this.proveedorService
      .listar({ page: 0, size: 100, activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => {
          this.proveedores.set(respuesta.content);
          this.cargandoProveedores.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.cargandoProveedores.set(false);
          this.errorProveedores.set(
            this.mensajeError(error) ??
              'No se pudo cargar el catálogo de proveedores.'
          );
        }
      });
  }

  private aplicarError(error: HttpErrorResponse): void {
    const cuerpo = (error.error ?? null) as CuerpoError | null;

    if (!cuerpo) {
      this.errorGeneral.set('No se pudo guardar la compra.');
      return;
    }

    if (cuerpo.code === 'PROVEEDOR_INEXISTENTE') {
      this.form.controls.idProveedor.setErrors({
        servidor: cuerpo.message ?? 'El proveedor seleccionado no existe.'
      });
      this.form.controls.idProveedor.markAsTouched();
      return;
    }

    if (cuerpo.code === 'PROVEEDOR_INACTIVO') {
      this.form.controls.idProveedor.setErrors({
        servidor:
          cuerpo.message ?? 'El proveedor seleccionado está desactivado.'
      });
      this.form.controls.idProveedor.markAsTouched();
      return;
    }

    if (cuerpo.code === 'FECHA_FUTURA') {
      this.form.controls.fecha.setErrors({
        servidor: cuerpo.message ?? 'La fecha no puede ser posterior a hoy.'
      });
      this.form.controls.fecha.markAsTouched();
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
      cuerpo.message ?? 'No se pudo guardar la compra.'
    );
  }

  private aFecha(valor: string | undefined): Date | null {
    if (!valor) {
      return null;
    }

    const [anio, mes, dia] = valor.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  private iso(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = error.error as { message?: string } | null;

    return cuerpo && typeof cuerpo.message === 'string'
      ? cuerpo.message
      : null;
  }
}
