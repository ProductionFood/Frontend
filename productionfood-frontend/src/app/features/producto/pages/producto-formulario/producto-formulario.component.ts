import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { UnidadMedida } from '../../../unidad-medida/models/unidad-medida.model';
import { UnidadMedidaService } from '../../../unidad-medida/services/unidad-medida.service';
import { CrearProductoDto, Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';

export interface ProductoFormularioData { producto?: Producto; }
interface CuerpoError { message?: string; fieldErrors?: { field: string; message: string }[]; }

function maxDosDecimales(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return { numeroInvalido: true };
  return Math.round(numero * 100) === numero * 100 ? null : { decimales: true };
}

@Component({
  selector: 'app-producto-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './producto-formulario.component.html',
  styleUrl: './producto-formulario.component.scss'
})
export class ProductoFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly datos = inject<ProductoFormularioData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ProductoFormularioComponent>>(MatDialogRef);

  readonly esEdicion = !!this.datos.producto;
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly unidades = signal<UnidadMedida[]>([]);
  readonly cargandoUnidades = signal(true);
  readonly errorUnidades = signal<string | null>(null);
  readonly precioTexto = signal('');

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control(this.datos.producto?.nombre ?? '', [Validators.required, Validators.maxLength(100)]),
    descripcion: this.fb.nonNullable.control(this.datos.producto?.descripcion ?? '', [Validators.maxLength(150)]),
    precioVenta: this.fb.control<number | null>(this.datos.producto?.precioVenta ?? null, [Validators.required, Validators.min(0), maxDosDecimales]),
    idUnidad: this.fb.control<number | null>(this.datos.producto?.unidad.idUnidad ?? null, [Validators.required])
  });

  constructor() {
    this.precioTexto.set(this.form.controls.precioVenta.value === null ? '' : new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(this.form.controls.precioVenta.value));
    this.cargarUnidades();
    // §19: el modal cierra con Esc y con clic en el overlay, pasando siempre por el guard de cambios sin guardar.
    this.ref.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cancelar());
    this.ref.keydownEvents().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(evento => {
      if (evento.key === 'Escape') this.cancelar();
    });
  }

  get sinUnidades(): boolean { return !this.cargandoUnidades() && this.unidades().length === 0; }

  cargarUnidades(): void {
    this.cargandoUnidades.set(true);
    this.errorUnidades.set(null);
    this.unidadService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: unidades => { this.unidades.set(unidades); this.cargandoUnidades.set(false); },
      error: (error: HttpErrorResponse) => {
        this.cargandoUnidades.set(false);
        this.errorUnidades.set(error.error?.message ?? 'No se pudieron cargar las unidades de venta.');
      }
    });
  }

  alEnfocarPrecio(): void {
    const valor = this.form.controls.precioVenta.value;
    this.precioTexto.set(valor === null ? '' : String(valor));
  }

  cambiarPrecio(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.precioTexto.set(texto);
    const normalizado = texto.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    if (!normalizado) {
      this.form.controls.precioVenta.setValue(null);
      return;
    }
    const numero = Number(normalizado);
    this.form.controls.precioVenta.setValue(Number.isFinite(numero) ? numero : null);
  }

  formatearPrecio(): void {
    this.form.controls.precioVenta.markAsTouched();
    const valor = this.form.controls.precioVenta.value;
    this.precioTexto.set(valor === null ? '' : new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor));
  }

  irAUnidades(): void {
    this.ref.close(false);
    void this.router.navigate(['/app/unidades-medida']);
  }

  guardar(): void {
    if (this.form.invalid || this.guardando() || this.cargandoUnidades() || this.sinUnidades) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    if (valor.precioVenta === null || valor.idUnidad === null) return;

    const dto: CrearProductoDto = {
      nombre: valor.nombre.trim(),
      descripcion: valor.descripcion.trim() || null,
      precioVenta: Number(valor.precioVenta.toFixed(2)),
      idUnidad: valor.idUnidad
    };
    this.guardando.set(true);
    this.errorGeneral.set(null);
    const peticion = this.datos.producto
      ? this.productoService.actualizar(this.datos.producto.idProducto, dto)
      : this.productoService.crear(dto);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.ref.close(true),
      error: (error: HttpErrorResponse) => { this.guardando.set(false); this.aplicarError(error); }
    });
  }

  cancelar(): void {
    if (this.guardando()) return;
    if (!this.form.dirty) { this.ref.close(false); return; }
    const data: ConfirmarDialogData = {
      titulo: 'Descartar cambios',
      mensaje: 'Tienes cambios sin guardar. ¿Quieres cerrar el formulario y descartarlos?',
      textoConfirmar: 'Descartar cambios', textoCancelar: 'Seguir editando', peligro: true
    };
    // Modal anidado deliberado (§19 lo desaconseja): es el guard que evita descartar cambios sin preguntar.
    this.dialog.open(ConfirmarDialogComponent, { data, width: '420px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => { if (confirmado) this.ref.close(false); });
  }

  errorCampo(campo: 'nombre' | 'descripcion' | 'precioVenta' | 'idUnidad'): string {
    const control = this.form.controls[campo];
    if (control.hasError('required')) {
      if (campo === 'nombre') return 'El nombre es obligatorio';
      if (campo === 'precioVenta') return 'El precio es obligatorio';
      return 'Seleccione una unidad de venta';
    }
    if (control.hasError('maxlength')) return campo === 'nombre' ? 'Máximo 100 caracteres' : 'Máximo 150 caracteres';
    if (control.hasError('min')) return 'Debe ser 0 o mayor';
    if (control.hasError('decimales')) return 'Use máximo dos decimales';
    if (control.hasError('numeroInvalido')) return 'Ingrese un precio válido';
    if (control.hasError('servidor')) return control.getError('servidor') as string;
    return '';
  }

  private aplicarError(error: HttpErrorResponse): void {
    const cuerpo = (error.error ?? null) as CuerpoError | null;
    if (cuerpo?.fieldErrors?.length) {
      for (const fieldError of cuerpo.fieldErrors) {
        const control = this.form.get(fieldError.field);
        if (control) { control.setErrors({ servidor: fieldError.message }); control.markAsTouched(); }
      }
      return;
    }
    this.errorGeneral.set(cuerpo?.message ?? 'No se pudo guardar el producto.');
  }
}
