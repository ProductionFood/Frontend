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
} from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import {
  CrearUnidadDto,
  UnidadMedida
} from '../../models/unidad-medida.model';
import { UnidadMedidaService } from '../../services/unidad-medida.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';

interface CuerpoError {
  code?: string;
  message?: string;
  fieldErrors?: { field: string; message: string }[];
}

/**
 * Formulario de unidad de medida (HU-07) como página con router, para crear y editar.
 * Si al editar cambia la abreviatura, avisa antes (R-04) porque altera cómo se
 * interpretan los registros que usan la unidad.
 */
@Component({
  selector: 'app-unidad-formulario',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './unidad-formulario.component.html',
  styleUrl: './unidad-formulario.component.scss'
})
export class UnidadFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly dialog = inject(MatDialog);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idUnidad = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly esEdicion = this.idUnidad !== null;

  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly unidad = signal<UnidadMedida | null>(null);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(50)
    ]),
    abreviatura: this.fb.nonNullable.control(
      '',
      [Validators.required, Validators.maxLength(50)]
    )
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    if (this.esEdicion) {
      this.unidadService.obtener(this.idUnidad!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: u => {
          this.unidad.set(u);
          this.form.patchValue({ nombre: u.nombre, abreviatura: u.abreviatura });
        },
        error: (e: HttpErrorResponse) => {
          this.errorGeneral.set(e.error?.message ?? 'No se pudo cargar la unidad.');
        }
      });
    }
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    const abreviatura = this.form.controls.abreviatura.value.trim();
    const cambioAbreviatura =
      this.esEdicion && abreviatura !== this.unidad()?.abreviatura;

    if (cambioAbreviatura) {
      this.confirmarCambioAbreviatura();
      return;
    }

    this.enviar(false);
  }

  volver(): void {
    if (!this.form.dirty) {
      void this.router.navigate(['/app/unidades-medida']);
      return;
    }

    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje:
        'Tienes cambios sin guardar. ¿Quieres salir y descartarlos?',
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
          void this.router.navigate(['/app/unidades-medida']);
        }
      });
  }

  get nombreError(): string {
    const control = this.form.controls.nombre;

    if (control.hasError('required')) {
      return 'El nombre es obligatorio';
    }

    if (control.hasError('maxlength')) {
      return 'Máximo 50 caracteres';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  get abreviaturaError(): string {
    const control = this.form.controls.abreviatura;

    if (control.hasError('required')) {
      return 'La abreviatura es obligatoria';
    }

    if (control.hasError('maxlength')) {
      return 'Máximo 50 caracteres';
    }

    if (control.hasError('servidor')) {
      return control.getError('servidor');
    }

    return '';
  }

  private confirmarCambioAbreviatura(): void {
    const unidad = this.unidad();

    if (!unidad) {
      this.enviar(false);
      return;
    }

    const enUso = unidad.enUso;
    const contexto =
      enUso !== undefined && enUso !== null
        ? `«${unidad.nombre} (${unidad.abreviatura})» se usa en ${enUso} registro(s). `
        : `«${unidad.nombre} (${unidad.abreviatura})» puede estar en uso. `;

    const data: ConfirmarDialogData = {
      titulo: 'Cambiar abreviatura',
      mensaje:
        `${contexto}Cambiar la abreviatura modificará cómo se interpretan ` +
        'las cantidades de los registros que la usan, aunque sus valores no cambien.',
      textoConfirmar: 'Entiendo, cambiar',
      peligro: true
    };

    this.dialog
      .open(ConfirmarDialogComponent, {
        data,
        width: '460px',
        autoFocus: 'dialog'
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.enviar(true);
        }
      });
  }

  private enviar(confirmar: boolean): void {
    const valor = this.form.getRawValue();

    const dto: CrearUnidadDto = {
      nombre: valor.nombre.trim(),
      abreviatura: valor.abreviatura.trim()
    };

    this.guardando.set(true);
    this.errorGeneral.set(null);

    const peticion = this.esEdicion
      ? this.unidadService.actualizar(this.idUnidad!, dto, confirmar)
      : this.unidadService.crear(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notificacion.exito(
          this.esEdicion ? 'Unidad actualizada correctamente.' : 'Unidad registrada correctamente.'
        );
        void this.router.navigate(['/app/unidades-medida']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  private aplicarError(error: HttpErrorResponse): void {
    const cuerpo = (error.error ?? null) as CuerpoError | null;

    if (!cuerpo) {
      this.errorGeneral.set('No se pudo guardar la unidad.');
      return;
    }

    if (cuerpo.code === 'ABREVIATURA_DUPLICADA') {
      this.form.controls.abreviatura.setErrors({
        servidor: cuerpo.message ?? 'La abreviatura ya está registrada.'
      });
      this.form.controls.abreviatura.markAsTouched();
      return;
    }

    if (cuerpo.code === 'UNIDAD_EN_USO') {
      this.errorGeneral.set(
        cuerpo.message ??
          'La unidad está en uso. Confirma el cambio de abreviatura.'
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
      cuerpo.message ?? 'No se pudo guardar la unidad.'
    );
  }
}
