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
import { CrearProductoDto, Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';

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
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './producto-formulario.component.html',
  styleUrl: './producto-formulario.component.scss'
})
export class ProductoFormularioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificacion = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly esEdicion = this.id !== null;
  readonly producto = signal<Producto | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly unidades = signal<UnidadMedida[]>([]);
  readonly cargandoUnidades = signal(true);
  readonly errorUnidades = signal<string | null>(null);
  readonly precioTexto = signal('');

  readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    descripcion: this.fb.nonNullable.control('', [Validators.maxLength(150)]),
    precioVenta: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), maxDosDecimales]),
    idUnidad: this.fb.control<number | null>(null, [Validators.required])
  });

  ngOnInit(): void {
    this.cargarUnidades();
    if (this.id !== null) this.cargarProducto();
  }

  get sinUnidades(): boolean {
    return !this.cargandoUnidades() && this.unidades().length === 0;
  }

  private cargarProducto(): void {
    this.cargando.set(true);
    this.errorGeneral.set(null);
    this.productoService.obtener(this.id as number).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: producto => {
        this.producto.set(producto);
        this.form.patchValue({
          nombre: producto.nombre,
          descripcion: producto.descripcion ?? '',
          precioVenta: producto.precioVenta,
          idUnidad: producto.unidad.idUnidad
        });
        this.precioTexto.set(new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(producto.precioVenta));
        this.form.markAsPristine();
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorGeneral.set(error.error?.message ?? 'No se pudo cargar el producto.');
      }
    });
  }

  cargarUnidades(): void {
    this.cargandoUnidades.set(true);
    this.errorUnidades.set(null);
    this.unidadService.listar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: unidades => {
        this.unidades.set(unidades);
        this.cargandoUnidades.set(false);
      },
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
    const peticion = this.id !== null
      ? this.productoService.actualizar(this.id, dto)
      : this.productoService.crear(dto);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificacion.exito(this.esEdicion ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
        void this.router.navigate(['/app/productos']);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.aplicarError(error);
      }
    });
  }

  cancelar(): void {
    if (this.guardando()) return;
    this.confirmarSalida(() => void this.router.navigate(['/app/productos']));
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
        if (control) {
          control.setErrors({ servidor: fieldError.message });
          control.markAsTouched();
        }
      }
      return;
    }
    this.errorGeneral.set(cuerpo?.message ?? 'No se pudo guardar el producto.');
  }
}
