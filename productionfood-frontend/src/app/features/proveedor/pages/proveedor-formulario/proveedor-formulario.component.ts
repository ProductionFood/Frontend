import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { ActualizarProveedorDto, CrearProveedorDto, Proveedor } from '../../models/proveedor.model';
import { ProveedorService } from '../../services/proveedor.service';

export interface ProveedorFormularioData { proveedor?: Proveedor; }
interface CuerpoError { message?: string; fieldErrors?: { field: string; message: string }[]; }

@Component({
  selector: 'app-proveedor-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './proveedor-formulario.component.html',
  styleUrl: './proveedor-formulario.component.scss'
})
export class ProveedorFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly proveedorService = inject(ProveedorService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly datos = inject<ProveedorFormularioData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ProveedorFormularioComponent>>(MatDialogRef);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly esEdicion = !!this.datos.proveedor;

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control(this.datos.proveedor?.nombre ?? '', [Validators.required, Validators.maxLength(100)]),
    contacto: this.fb.nonNullable.control(this.datos.proveedor?.contacto ?? '', [Validators.maxLength(100)]),
    telefono: this.fb.nonNullable.control(this.datos.proveedor?.telefono ?? '', [Validators.maxLength(20)]),
    correo: this.fb.nonNullable.control(this.datos.proveedor?.correo ?? '', [Validators.maxLength(100), Validators.email])
  });

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    const dto: CrearProveedorDto | ActualizarProveedorDto = {
      nombre: valor.nombre.trim(),
      contacto: valor.contacto.trim() || null,
      telefono: valor.telefono.trim() || null,
      correo: valor.correo.trim() || null
    };
    this.guardando.set(true);
    this.errorGeneral.set(null);
    const peticion = this.datos.proveedor
      ? this.proveedorService.actualizar(this.datos.proveedor.idProveedor, dto)
      : this.proveedorService.crear(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.ref.close(true),
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  cancelar(): void {
    if (this.guardando()) return;
    if (!this.form.dirty) {
      this.ref.close(false);
      return;
    }
    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje: 'Tienes cambios sin guardar. ¿Quieres cerrar el formulario y descartarlos?',
      textoConfirmar: 'Descartar cambios',
      textoCancelar: 'Seguir editando',
      peligro: true
    };
    this.dialog.open(ConfirmarDialogComponent, { data, width: '420px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => { if (confirmado) this.ref.close(false); });
  }

  get nombreError(): string {
    const c = this.form.controls.nombre;
    if (c.hasError('required')) return 'El nombre es obligatorio';
    if (c.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    return '';
  }

  get contactoError(): string {
    const c = this.form.controls.contacto;
    if (c.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    return '';
  }

  get telefonoError(): string {
    const c = this.form.controls.telefono;
    if (c.hasError('maxlength')) return 'Máximo 20 caracteres';
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    return '';
  }

  get correoError(): string {
    const c = this.form.controls.correo;
    if (c.hasError('email')) return 'Ingrese un correo válido';
    if (c.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    return '';
  }

  private aplicarError(error: HttpErrorResponse): void {
    const cuerpo = (error.error ?? null) as CuerpoError | null;
    if (cuerpo?.fieldErrors?.length) {
      for (const fieldError of cuerpo.fieldErrors) {
        const control = this.form.get(fieldError.field);
        if (control) {
          control.setErrors({ servidor: fieldError.message });
          control.markAsTouched();
        }
      }
      return;
    }
    this.errorGeneral.set(cuerpo?.message ?? 'No se pudo guardar el proveedor.');
  }
}
