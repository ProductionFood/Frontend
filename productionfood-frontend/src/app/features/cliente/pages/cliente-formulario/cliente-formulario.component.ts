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
import { Cliente, CrearClienteDto } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';

export interface ClienteFormularioData { cliente?: Cliente; }
interface CuerpoError { message?: string; fieldErrors?: { field: string; message: string }[]; }

@Component({
  selector: 'app-cliente-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './cliente-formulario.component.html',
  styleUrl: './cliente-formulario.component.scss'
})
export class ClienteFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly datos = inject<ClienteFormularioData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ClienteFormularioComponent>>(MatDialogRef);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly esEdicion = !!this.datos.cliente;

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control(this.datos.cliente?.nombre ?? '', [Validators.required, Validators.maxLength(100)]),
    contacto: this.fb.nonNullable.control(this.datos.cliente?.contacto ?? '', [Validators.maxLength(100)]),
    telefono: this.fb.nonNullable.control(this.datos.cliente?.telefono ?? '', [Validators.maxLength(20)])
  });

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    const dto: CrearClienteDto = {
      nombre: valor.nombre.trim(),
      contacto: valor.contacto.trim() || null,
      telefono: valor.telefono.trim() || null
    };
    this.guardando.set(true);
    this.errorGeneral.set(null);
    const peticion = this.datos.cliente
      ? this.clienteService.actualizar(this.datos.cliente.idCliente, dto)
      : this.clienteService.crear(dto);

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
    this.errorGeneral.set(cuerpo?.message ?? 'No se pudo guardar el cliente.');
  }
}
