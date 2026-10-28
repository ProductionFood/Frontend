import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { Rol, Usuario } from '../../models/usuario.model';
import { RolService } from '../../services/rol.service';
import { UsuarioService } from '../../services/usuario.service';

interface CuerpoError { code?: string; message?: string; fieldErrors?: { field: string; message: string }[]; }

/**
 * Página de edición de usuario (HU-02). Edita nombre, correo y rol; la
 * contraseña no se toca aquí (R-03).
 */
@Component({
  selector: 'app-usuario-editor',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './usuario-editor.component.html',
  styleUrl: './usuario-editor.component.scss'
})
export class UsuarioEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolService = inject(RolService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly usuario = signal<Usuario | null>(null);
  readonly cargando = signal(false);
  readonly roles = signal<Rol[]>([]);
  readonly cargandoRoles = signal(true);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    correo: this.fb.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    idRol: this.fb.control<number | null>(null, [Validators.required])
  });

  ngOnInit(): void {
    this.cargarRoles();
    if (this.id !== null) this.cargarUsuario();
  }

  private cargarUsuario(): void {
    this.cargando.set(true);
    this.errorGeneral.set(null);
    this.usuarioService.obtener(this.id as number).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: usuario => {
        this.usuario.set(usuario);
        this.form.patchValue({ nombre: usuario.nombre, correo: usuario.correo, idRol: usuario.rol.idRol });
        this.form.markAsPristine();
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorGeneral.set(this.mensajeError(error) ?? 'No se pudo cargar el usuario.');
      }
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    if (valor.idRol === null || this.id === null) return;
    this.guardando.set(true);
    this.errorGeneral.set(null);
    this.usuarioService.actualizar(this.id, {
      nombre: valor.nombre.trim(),
      correo: valor.correo.trim().toLowerCase(),
      idRol: valor.idRol
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificacion.exito('Usuario actualizado correctamente.');
        void this.router.navigate(['/app/usuarios']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  cancelar(): void {
    if (this.guardando()) return;
    this.confirmarSalida(() => void this.router.navigate(['/app/usuarios']));
  }

  private confirmarSalida(accion: () => void): void {
    if (!this.form.dirty) {
      accion();
      return;
    }
    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje: 'Tienes cambios sin guardar. ¿Quieres salir y descartarlos?',
      textoConfirmar: 'Descartar cambios',
      textoCancelar: 'Seguir editando',
      peligro: true
    };
    // Modal deliberado (§19 desaconseja anidar): es el guard que evita descartar cambios sin preguntar.
    this.dialog.open(ConfirmarDialogComponent, { data, width: '420px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => { if (confirmado) accion(); });
  }

  get nombreError(): string {
    const control = this.form.controls.nombre;
    if (control.hasError('required')) return 'El nombre es obligatorio';
    if (control.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (control.hasError('servidor')) return control.getError('servidor');
    return '';
  }

  get correoError(): string {
    const control = this.form.controls.correo;
    if (control.hasError('required')) return 'El correo es obligatorio';
    if (control.hasError('email')) return 'Ingrese un correo válido';
    if (control.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (control.hasError('servidor')) return control.getError('servidor');
    return '';
  }

  get rolError(): string {
    const control = this.form.controls.idRol;
    if (control.hasError('required')) return 'Seleccione un rol';
    if (control.hasError('servidor')) return control.getError('servidor');
    return '';
  }

  private cargarRoles(): void {
    this.rolService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: roles => {
        this.roles.set(roles);
        this.cargandoRoles.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoRoles.set(false);
        this.errorGeneral.set(this.mensajeError(error) ?? 'No se pudieron cargar los roles.');
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
      this.form.controls.correo.setErrors({ servidor: cuerpo.message ?? 'El correo ya está registrado.' });
      this.form.controls.correo.markAsTouched();
      return;
    }
    if (cuerpo.code === 'ROL_INEXISTENTE') {
      this.form.controls.idRol.setErrors({ servidor: cuerpo.message ?? 'El rol especificado no existe.' });
      this.form.controls.idRol.markAsTouched();
      return;
    }
    if (cuerpo.code === 'AUTO_DEGRADACION') {
      this.errorGeneral.set(cuerpo.message ?? 'No puede cambiar su propio rol.');
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
    this.errorGeneral.set(cuerpo.message ?? 'No se pudo actualizar el usuario.');
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = error.error as { message?: string } | null;
    return cuerpo && typeof cuerpo.message === 'string' ? cuerpo.message : null;
  }
}
