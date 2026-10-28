import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UnidadMedida } from '../../../unidad-medida/models/unidad-medida.model';
import { UnidadMedidaService } from '../../../unidad-medida/services/unidad-medida.service';
import { ActualizarProductoDto, CrearProductoDto, Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';

function maxDosDecimales(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return { numeroInvalido: true };
  return Math.round(numero * 100) === numero * 100 ? null : { decimales: true };
}

@Component({
  selector: 'app-producto-formulario-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './producto-formulario-page.component.html',
  styleUrl: './producto-formulario-page.component.scss'
})
export class ProductoFormularioPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly unidades = signal<UnidadMedida[]>([]);
  readonly cargandoUnidades = signal(true);
  readonly errorUnidades = signal<string | null>(null);
  readonly precioTexto = signal('');
  readonly esEdicion = signal(false);
  readonly productoId = signal<number | null>(null);

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    descripcion: this.fb.nonNullable.control('', [Validators.maxLength(150)]),
    precioVenta: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), maxDosDecimales]),
    idUnidad: this.fb.control<number | null>(null, [Validators.required])
  });

  constructor() {
    this.precioTexto.set('');
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productoId.set(Number(id));
      this.esEdicion.set(true);
      this.cargarProducto(Number(id));
    }
    this.cargarUnidades();
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

  cargarProducto(id: number): void {
    this.productoService.obtener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => {
        this.form.controls.nombre.setValue(p.nombre);
        this.form.controls.descripcion.setValue(p.descripcion ?? '');
        this.form.controls.precioVenta.setValue(p.precioVenta);
        this.form.controls.idUnidad.setValue(p.unidad.idUnidad);
        this.precioTexto.set(new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.precioVenta));
      },
      error: (e: HttpErrorResponse) => {
        this.errorGeneral.set(e.error?.message ?? 'No se pudo cargar el producto.');
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
    void this.router.navigate(['/app/unidades-medida']);
  }

  volver(): void {
    void this.router.navigate(['/app/productos']);
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
    const peticion = this.esEdicion() && this.productoId() !== null
      ? this.productoService.actualizar(this.productoId()!, dto as ActualizarProductoDto)
      : this.productoService.crear(dto);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificacion.exito(this.esEdicion() ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
        void this.router.navigate(['/app/productos']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
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
    const cuerpo = (error.error ?? null) as { message?: string; fieldErrors?: { field: string; message: string }[] } | null;
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
