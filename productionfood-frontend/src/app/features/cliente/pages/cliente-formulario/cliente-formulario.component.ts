import { Component, DestroyRef, inject, signal } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ConfirmarDialogComponent,
  ConfirmarDialogData
} from '@shared/components/confirmar-dialog/confirmar-dialog.component';
import { Cliente, CrearClienteDto } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';
import { NotificacionService } from '@core/ui/notificacion.service';

interface CuerpoError {
  message?: string;
  fieldErrors?: { field: string; message: string }[];
}

@Component({
  selector: 'app-cliente-formulario',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './cliente-formulario.component.html',
  styleUrl: './cliente-formulario.component.scss'
})
export class ClienteFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clienteService = inject(ClienteService);
  private readonly dialog = inject(MatDialog);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idCliente = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly esEdicion = this.idCliente !== null;

  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly cliente = signal<Cliente | null>(null);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    contacto: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    telefono: this.fb.nonNullable.control('', [Validators.maxLength(20)])
  });

  constructor() {
    if (this.esEdicion) {
      this.cargarCliente(this.idCliente!);
    }
  }

  cargarCliente(id: number): void {
    this.clienteService.obtener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: c => {
        this.cliente.set(c);
        this.form.patchValue({
          nombre: c.nombre,
          contacto: c.contacto ?? '',
          telefono: c.telefono ?? ''
        });
      },
      error: (e: HttpErrorResponse) => {
        this.errorGeneral.set(e.error?.message ?? 'No se pudo cargar el cliente.');
      }
    });
  }

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

    const peticion = this.esEdicion
      ? this.clienteService.actualizar(this.idCliente!, dto)
      : this.clienteService.crear(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notificacion.exito(
          this.esEdicion ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.'
        );
        void this.router.navigate(['/app/clientes']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  volver(): void {
    if (!this.form.dirty) {
      void this.router.navigate(['/app/clientes']);
      return;
    }

    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje: 'Tienes cambios sin guardar. ¿Quieres salir y descartarlos?',
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
          void this.router.navigate(['/app/clientes']);
        }
      });
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
