import { Component, DestroyRef, inject, signal } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

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

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Rol, Usuario } from '../../models/usuario.model';
import { RolService } from '../../services/rol.service';
import { UsuarioService } from '../../services/usuario.service';

export interface UsuarioEditorData {
  usuario: Usuario;
}

interface CuerpoError {
  code?: string;
  message?: string;
  fieldErrors?: { field: string; message: string }[];
}

/**
 * Diálogo de edición de usuario (HU-02). Edita nombre, correo y rol; la
 * contraseña no se toca aquí (R-03). Cierra con `true` si guardó.
 */
@Component({
  selector: 'app-usuario-editor',
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
  templateUrl: './usuario-editor.component.html',
  styleUrl: './usuario-editor.component.scss'
})
export class UsuarioEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolService = inject(RolService);
  private readonly destroyRef = inject(DestroyRef);

  readonly datos = inject<UsuarioEditorData>(MAT_DIALOG_DATA);

  private readonly ref =
    inject<MatDialogRef<UsuarioEditorComponent>>(MatDialogRef);

  readonly roles = signal<Rol[]>([]);
  readonly cargandoRoles = signal(true);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(100)
    ]),
    correo: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(100)
    ]),
    idRol: this.fb.control<number | null>(null, [Validators.required])
  });

  constructor() {
    const { usuario } = this.datos;

    this.form.patchValue({
      nombre: usuario.nombre,
      correo: usuario.correo,
      idRol: usuario.rol.idRol
    });

    this.cargarRoles();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();

    if (valor.idRol === null) {
      return;
    }

    this.guardando.set(true);
    this.errorGeneral.set(null);

    this.usuarioService
      .actualizar(this.datos.usuario.idUsuario, {
        nombre: valor.nombre.trim(),
        correo: valor.correo.trim().toLowerCase(),
        idRol: valor.idRol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          this.aplicarError(error);
        }
      });
  }

  cancelar(): void {
    this.ref.close(false);
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

  get correoError(): string {
    const control = this.form.controls.correo;

    if (control.hasError('required')) {
      return 'El correo es obligatorio';
    }

    if (control.hasError('email')) {
      return 'Ingrese un correo válido';
    }

    if (control.hasError('maxlength')) {
      return 'Máximo 100 caracteres';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  get rolError(): string {
    const control = this.form.controls.idRol;

    if (control.hasError('required')) {
      return 'Seleccione un rol';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  private cargarRoles(): void {
    this.rolService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: roles => {
          this.roles.set(roles);
          this.cargandoRoles.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.cargandoRoles.set(false);
          this.errorGeneral.set(
            this.mensajeError(error) ?? 'No se pudieron cargar los roles.'
          );
        }
      });
  }

  private aplicarError(error: HttpErrorResponse): void {
    const cuerpo = (error.error ?? null) as CuerpoError | null;

    if (!cuerpo) {
      this.errorGeneral.set('No se pudo actualizar el usuario.');
      return;
    }

    if (cuerpo.code === 'CORREO_DUPLICADO') {
      this.form.controls.correo.setErrors({
        servidor: cuerpo.message ?? 'El correo ya está registrado.'
      });
      this.form.controls.correo.markAsTouched();
      return;
    }

    if (cuerpo.code === 'ROL_INEXISTENTE') {
      this.form.controls.idRol.setErrors({
        servidor: cuerpo.message ?? 'El rol especificado no existe.'
      });
      this.form.controls.idRol.markAsTouched();
      return;
    }

    if (cuerpo.code === 'AUTO_DEGRADACION') {
      this.errorGeneral.set(
        cuerpo.message ?? 'No puede cambiar su propio rol.'
      );
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
      cuerpo.message ?? 'No se pudo actualizar el usuario.'
    );
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = error.error as { message?: string } | null;

    return cuerpo && typeof cuerpo.message === 'string'
      ? cuerpo.message
      : null;
  }
}
