import {
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  MatCardModule
} from '@angular/material/card';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatProgressSpinnerModule
} from '@angular/material/progress-spinner';

import {
  MatCheckboxModule
} from '@angular/material/checkbox';

import {
  AuthService
} from '../../core/auth/auth.service';

import {
  ApiError
} from '../../shared/models/api-error.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly mostrarPassword = signal(false);
  readonly errorServidor = signal<string | null>(null);
  readonly sesionExpirada = signal(false);

  readonly form = this.fb.nonNullable.group({
    correo: [
      '',
      [Validators.required, Validators.email]
    ],
    password: [
      '',
      [Validators.required]
    ]
  });

  constructor() {
    const expirada = this.activatedRoute
      .snapshot
      .queryParamMap
      .get('sesionExpirada');

    this.sesionExpirada.set(expirada === 'true');
  }

  alternarPassword(): void {
    this.mostrarPassword.update(visible => !visible);
  }

  iniciarSesion(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorServidor.set(null);
    this.limpiarErroresServidor();

    const credentials = this.form.getRawValue();

    this.authService
      .login(credentials)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false))
      )
      .subscribe({
        next: () => {
          void this.redireccionar();
        },
        error: (error: HttpErrorResponse) => {
          this.form.controls.password.reset();
          this.mostrarError(error);
        }
      });
  }

  private mostrarError(error: HttpErrorResponse): void {
    if (this.aplicarErroresDeCampo(error)) {
      return;
    }

    if (error.status === 401) {
      this.errorServidor.set('Credenciales incorrectas.');
      return;
    }

    if (error.status === 403) {
      this.errorServidor.set(
        'Su usuario está desactivado. Contacte al administrador.'
      );
      return;
    }

    if (error.status === 0) {
      this.errorServidor.set(
        'No se pudo conectar con el servidor.'
      );
      return;
    }

    this.errorServidor.set(
      'No se pudo iniciar sesión. Intente nuevamente.'
    );
  }

  private aplicarErroresDeCampo(
    error: HttpErrorResponse
  ): boolean {
    const body: unknown = error.error;

    if (
      body === null ||
      typeof body !== 'object'
    ) {
      return false;
    }

    const apiError = body as Partial<ApiError>;

    if (!Array.isArray(apiError.fieldErrors)) {
      return false;
    }

    let aplicado = false;

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
      aplicado = true;
    }

    return aplicado;
  }

  private limpiarErroresServidor(): void {
    for (const control of Object.values(this.form.controls)) {
      const errors = control.errors;

      if (!errors?.['servidor']) {
        continue;
      }

      const nuevosErrores = { ...errors };
      delete nuevosErrores['servidor'];
      control.setErrors(
        Object.keys(nuevosErrores).length > 0
          ? nuevosErrores
          : null
      );
    }
  }

  private redireccionar(): void {
    const rol = this.authService.rol();

    switch (rol) {
      case 'ADMIN':
      case 'CONSULTA':
        void this.router.navigate(['/app/dashboard']);
        break;

      case 'VENTAS':
        void this.router.navigate(['/app/pedidos']);
        break;

      case 'PRODUCCION':
        void this.router.navigate(['/app/produccion']);
        break;

      case 'COMPRAS':
        void this.router.navigate(['/app/compras']);
        break;

      default:
        void this.router.navigate(['/app/dashboard']);
    }
  }
}
