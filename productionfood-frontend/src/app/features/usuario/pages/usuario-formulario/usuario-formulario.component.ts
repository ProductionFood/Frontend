import {
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import { CommonModule } from '@angular/common';

import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CrearUsuarioDto,
  Rol
} from '../../models/usuario.model';

import { UsuarioService } from '../../services/usuario.service';
import { RolService } from '../../services/rol.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';


function confirmarPasswordValidator(
  control: AbstractControl
): ValidationErrors | null {

  const password = control.get('password')?.value;
  const confirmar = control.get('confirmarPassword')?.value;

  if (!password || !confirmar) {
    return null;
  }

  return password === confirmar
    ? null
    : { passwordNoCoincide: true };
}


@Component({
  selector: 'app-usuario-formulario',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],

  templateUrl: './usuario-formulario.component.html',
  styleUrl: './usuario-formulario.component.scss'
})
export class UsuarioFormularioComponent {

  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolService = inject(RolService);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);


  // =========================================================
  // ROLES
  // =========================================================

  readonly roles = signal<Rol[]>([]);

  readonly cargandoRoles = signal(true);

  readonly errorRoles = signal<string | null>(null);


  // =========================================================
  // ESTADO DEL FORMULARIO
  // =========================================================

  readonly guardando = signal(false);


  // =========================================================
  // VISIBILIDAD DE CONTRASEÑAS
  // =========================================================

  readonly mostrarPassword = signal(false);

  readonly mostrarConfirmacion = signal(false);


  // =========================================================
  // FORTALEZA DE CONTRASEÑA
  // =========================================================

  readonly fortalezaPassword = signal(0);

  readonly textoFortaleza =
    signal('Ingresa una contraseña');


  // =========================================================
  // FORMULARIO
  // =========================================================

  readonly form = this.fb.group(
    {
      nombre: this.fb.control('', {
        validators: [
          Validators.required,
          Validators.maxLength(100)
        ]
      }),

      correo: this.fb.control('', {
        validators: [
          Validators.required,
          Validators.email,
          Validators.maxLength(100)
        ]
      }),

      password: this.fb.control('', {
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(72)
        ]
      }),

      confirmarPassword: this.fb.control('', {
        validators: [
          Validators.required
        ]
      }),

      idRol: this.fb.control<number | null>(null, {
        validators: [
          Validators.required
        ]
      })
    },
    {
      validators: confirmarPasswordValidator
    }
  );


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor() {

    this.cargarRoles();

    this.form.controls.password.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(password => {

        this.actualizarFortaleza(
          password ?? ''
        );

      });

  }


  // =========================================================
  // CARGAR ROLES
  // =========================================================

  cargarRoles(): void {

    this.cargandoRoles.set(true);

    this.errorRoles.set(null);

    this.rolService
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: roles => {

          this.roles.set(roles);

          this.cargandoRoles.set(false);

        },

        error: (error: HttpErrorResponse) => {

          this.cargandoRoles.set(false);

          this.errorRoles.set(
            error.error?.message ??
            'No se pudieron cargar los roles.'
          );

        }

      });

  }


  // =========================================================
  // REGISTRAR USUARIO
  // =========================================================

  registrar(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }


    const valor = this.form.getRawValue();


    if (valor.idRol === null) {
      return;
    }


    const dto: CrearUsuarioDto = {

      nombre:
        valor.nombre?.trim() ?? '',

      correo:
        valor.correo?.trim().toLowerCase() ?? '',

      password:
        valor.password ?? '',

      idRol:
        valor.idRol

    };


    this.guardando.set(true);


    this.usuarioService
      .crear(dto)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: () => {

          this.guardando.set(false);

          this.notificacion.exito(
            'Usuario registrado correctamente.'
          );

          this.form.reset();

          this.fortalezaPassword.set(0);

          this.textoFortaleza.set(
            'Ingresa una contraseña'
          );

        },

        error: (error: HttpErrorResponse) => {

          this.guardando.set(false);

          this.aplicarErroresServidor(error);

        }

      });

  }


  // =========================================================
  // ERRORES DEL SERVIDOR
  // =========================================================

  private aplicarErroresServidor(
    error: HttpErrorResponse
  ): void {

    const apiError = error.error;


    if (!apiError) {

      this.notificacion.error(
        'No se pudo registrar el usuario.'
      );

      return;

    }


    if (apiError.code === 'CORREO_DUPLICADO') {

      this.form.controls.correo.setErrors({
        servidor: apiError.message
      });

      this.form.controls.correo.markAsTouched();

      return;

    }


    if (apiError.code === 'ROL_INEXISTENTE') {

      this.form.controls.idRol.setErrors({
        servidor: apiError.message
      });

      this.form.controls.idRol.markAsTouched();

      return;

    }


    if (apiError.code === 'PASSWORD_DEBIL') {

      this.form.controls.password.setErrors({
        servidor: apiError.message
      });

      this.form.controls.password.markAsTouched();

      return;

    }


    if (apiError.fieldErrors?.length) {

      for (const fieldError of apiError.fieldErrors) {

        const control =
          this.form.get(fieldError.field);


        if (control) {

          control.setErrors({
            servidor: fieldError.message
          });

          control.markAsTouched();

        }

      }

      return;

    }


    this.notificacion.error(
      apiError.message ??
      'Ocurrió un error al registrar el usuario.'
    );

  }


  // =========================================================
  // FORTALEZA DE CONTRASEÑA
  // =========================================================

  private actualizarFortaleza(
    password: string
  ): void {

    if (!password) {

      this.fortalezaPassword.set(0);

      this.textoFortaleza.set(
        'Ingresa una contraseña'
      );

      return;

    }


    let puntos = 0;


    if (password.length >= 8) {
      puntos++;
    }


    if (/[A-Z]/.test(password)) {
      puntos++;
    }


    if (/[a-z]/.test(password)) {
      puntos++;
    }


    if (/[0-9]/.test(password)) {
      puntos++;
    }


    if (/[^A-Za-z0-9]/.test(password)) {
      puntos++;
    }


    this.fortalezaPassword.set(puntos);


    if (puntos <= 2) {

      this.textoFortaleza.set(
        'Débil'
      );

    } else if (puntos <= 4) {

      this.textoFortaleza.set(
        'Buena'
      );

    } else {

      this.textoFortaleza.set(
        'Fuerte'
      );

    }

  }


  // =========================================================
  // MOSTRAR / OCULTAR CONTRASEÑA
  // =========================================================

  alternarPassword(): void {

    this.mostrarPassword.update(
      valor => !valor
    );

  }


  alternarConfirmacion(): void {

    this.mostrarConfirmacion.update(
      valor => !valor
    );

  }


  // =========================================================
  // CANCELAR
  // =========================================================

  cancelar(): void {

    this.form.reset();

    this.fortalezaPassword.set(0);

    this.textoFortaleza.set(
      'Ingresa una contraseña'
    );

  }


  // =========================================================
  // MENSAJES DE ERROR
  // =========================================================

  get nombreError(): string {

    const control =
      this.form.controls.nombre;


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

    const control =
      this.form.controls.correo;


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


  get passwordError(): string {

    const control =
      this.form.controls.password;


    if (control.hasError('required')) {

      return 'La contraseña es obligatoria';

    }


    if (control.hasError('minlength')) {

      return 'Mínimo 8 caracteres';

    }


    if (control.hasError('maxlength')) {

      return 'Máximo 72 caracteres';

    }


    if (control.hasError('servidor')) {

      return control.getError('servidor');

    }


    return '';

  }


  get confirmarPasswordError(): string {

    const control =
      this.form.controls.confirmarPassword;


    if (control.hasError('required')) {

      return 'Confirme la contraseña';

    }


    if (
      this.form.hasError('passwordNoCoincide') &&
      control.touched
    ) {

      return 'Las contraseñas no coinciden';

    }


    return '';

  }


  get rolError(): string {

    const control =
      this.form.controls.idRol;


    if (control.hasError('required')) {

      return 'Seleccione un rol';

    }


    if (control.hasError('servidor')) {

      return control.getError('servidor');

    }


    return '';

  }

}