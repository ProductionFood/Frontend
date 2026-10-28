import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import { UnidadMedida } from '../../../unidad-medida/models/unidad-medida.model';
import { UnidadMedidaService } from '../../../unidad-medida/services/unidad-medida.service';
import { CrearMateriaPrimaDto, MateriaPrima } from '../../models/materia-prima.model';
import { MateriaPrimaService } from '../../services/materia-prima.service';

interface CuerpoError { code?: string; message?: string; fieldErrors?: { field: string; message: string }[]; }

/** R-02: máximo dos decimales, sin recurrir a aritmética binaria. */
function maxDosDecimales(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (Number.isNaN(numero)) return { numeroInvalido: true };
  return Math.round(numero * 100) === numero * 100 ? null : { decimales: true };
}

/**
 * Formulario de materia prima (HU-08) como página, para crear y editar.
 * El selector de unidad usa el catálogo de HU-07 y muestra "Nombre (abreviatura)";
 * los números llevan el sufijo de la unidad elegida.
 */
@Component({
  selector: 'app-materia-prima-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './materia-prima-formulario.component.html',
  styleUrl: './materia-prima-formulario.component.scss'
})
export class MateriaPrimaFormularioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly materiaPrimaService = inject(MateriaPrimaService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly esEdicion = this.id !== null;
  readonly materia = signal<MateriaPrima | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly unidades = signal<UnidadMedida[]>([]);
  readonly cargandoUnidades = signal(true);
  readonly errorUnidades = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    idUnidad: this.fb.control<number | null>(null, [Validators.required]),
    stockMinimo: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), maxDosDecimales]),
    costoUnitario: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), maxDosDecimales])
  });

  ngOnInit(): void {
    this.cargarUnidades();
    if (this.id !== null) this.cargarMateria();
  }

  get sinUnidades(): boolean {
    return !this.cargandoUnidades() && this.unidades().length === 0;
  }

  get unidadAbreviatura(): string {
    const id = this.form.controls.idUnidad.value;
    return this.unidades().find(unidad => unidad.idUnidad === id)?.abreviatura ?? '';
  }

  private cargarMateria(): void {
    this.cargando.set(true);
    this.errorGeneral.set(null);
    this.materiaPrimaService.obtener(this.id as number).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: materia => {
        this.materia.set(materia);
        this.form.patchValue({
          nombre: materia.nombre,
          idUnidad: materia.unidad.idUnidad,
          stockMinimo: materia.stockMinimo,
          costoUnitario: materia.costoUnitario
        });
        this.form.markAsPristine();
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorGeneral.set(this.mensajeError(error) ?? 'No se pudo cargar la materia prima.');
      }
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    if (valor.idUnidad === null || valor.stockMinimo === null || valor.costoUnitario === null) return;
    const dto: CrearMateriaPrimaDto = {
      nombre: valor.nombre.trim(),
      idUnidad: valor.idUnidad,
      stockMinimo: Number(valor.stockMinimo),
      costoUnitario: Number(valor.costoUnitario)
    };
    this.guardando.set(true);
    this.errorGeneral.set(null);
    const peticion = this.id !== null
      ? this.materiaPrimaService.actualizar(this.id, dto)
      : this.materiaPrimaService.crear(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificacion.exito(this.esEdicion ? 'Materia prima actualizada correctamente.' : 'Materia prima registrada correctamente.');
        void this.router.navigate(['/app/materias-primas']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  cancelar(): void {
    if (this.guardando()) return;
    this.confirmarSalida(() => void this.router.navigate(['/app/materias-primas']));
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

  irAUnidades(): void {
    void this.router.navigate(['/app/unidades-medida']);
  }

  get nombreError(): string {
    const control = this.form.controls.nombre;
    if (control.hasError('required')) return 'El nombre es obligatorio';
    if (control.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (control.hasError('servidor')) return control.getError('servidor');
    return '';
  }

  get unidadError(): string {
    const control = this.form.controls.idUnidad;
    if (control.hasError('required')) return 'Seleccione una unidad de medida';
    if (control.hasError('servidor')) return control.getError('servidor');
    return '';
  }

  get stockError(): string {
    const control = this.form.controls.stockMinimo;
    if (control.hasError('required')) return 'El stock mínimo es obligatorio';
    if (control.hasError('min')) return 'Debe ser 0 o mayor';
    if (control.hasError('decimales')) return 'Máximo 2 decimales';
    if (control.hasError('servidor')) return control.getError('servidor');
    return '';
  }

  get costoError(): string {
    const control = this.form.controls.costoUnitario;
    if (control.hasError('required')) return 'El costo unitario es obligatorio';
    if (control.hasError('min')) return 'Debe ser 0 o mayor';
    if (control.hasError('decimales')) return 'Máximo 2 decimales';
    if (control.hasError('servidor')) return control.getError('servidor');
    return '';
  }

  private cargarUnidades(): void {
    this.unidadService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: unidades => {
        this.unidades.set(unidades);
        this.cargandoUnidades.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoUnidades.set(false);
        this.errorUnidades.set(this.mensajeError(error) ?? 'No se pudo cargar el catálogo de unidades.');
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
      this.form.controls.idUnidad.setErrors({ servidor: cuerpo.message ?? 'La unidad seleccionada no existe.' });
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
    this.errorGeneral.set(cuerpo.message ?? 'No se pudo guardar la materia prima.');
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = error.error as { message?: string } | null;
    return cuerpo && typeof cuerpo.message === 'string' ? cuerpo.message : null;
  }
}
