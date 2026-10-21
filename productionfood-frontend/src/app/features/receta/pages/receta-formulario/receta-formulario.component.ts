import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { MateriaPrimaService } from '../../../materia-prima/services/materia-prima.service';
import { Producto } from '../../../producto/models/producto.model';
import { ProductoService } from '../../../producto/services/producto.service';
import { UnidadMedida } from '../../../unidad-medida/models/unidad-medida.model';
import { UnidadMedidaService } from '../../../unidad-medida/services/unidad-medida.service';
import { CrearRecetaDto, IngredienteRecetaDto, Receta } from '../../models/receta.model';
import { RecetaService } from '../../services/receta.service';
import { IngredienteDialogComponent } from '../../components/ingrediente-dialog/ingrediente-dialog.component';

function maxTresDecimales(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined || control.value === '') return null;
  const n = Number(control.value);
  if (!Number.isFinite(n)) return { numeroInvalido: true };
  return Math.round(n * 1000) === n * 1000 ? null : { decimales: true };
}

@Component({
  selector: 'app-receta-formulario', standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe, RouterLink, MatButtonModule, MatCardModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule, MatProgressSpinnerModule, MatSelectModule, MatTooltipModule],
  templateUrl: './receta-formulario.component.html', styleUrl: './receta-formulario.component.scss'
})
export class RecetaFormularioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(RecetaService);
  private readonly productoService = inject(ProductoService);
  private readonly materiaService = inject(MateriaPrimaService);
  private readonly unidadService = inject(UnidadMedidaService);
  private readonly dialog = inject(MatDialog);
  private readonly notificacion = inject(NotificacionService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idReceta = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly esEdicion = this.idReceta !== null;
  readonly soloLectura = !['ADMIN', 'PRODUCCION'].includes(this.auth.rol() ?? '');
  readonly receta = signal<Receta | null>(null);
  readonly productos = signal<Producto[]>([]);
  readonly unidades = signal<UnidadMedida[]>([]);
  readonly materias = signal<MateriaPrima[]>([]);
  readonly ingredientes = signal<IngredienteRecetaDto[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly form = this.fb.group({
    idProducto: this.fb.control<number | null>(null, Validators.required),
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    cantidadProducir: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.001), maxTresDecimales]),
    idUnidad: this.fb.control<number | null>(null, Validators.required)
  });

  constructor() { this.cargar(); }
  get nombreProducto(): string { return this.productos().find(p => p.idProducto === this.form.controls.idProducto.value)?.nombre ?? this.receta()?.producto?.nombre ?? 'Producto'; }
  get costoTotal(): number { return this.ingredientes().reduce((total, i) => total + i.cantidad * (this.materias().find(m => m.idMateriaPrima === i.idMateriaPrima)?.costoUnitario ?? 0), 0); }
  get rendimiento(): number { return Number(this.form.controls.cantidadProducir.value ?? 0); }
  get costoPorUnidad(): number { return this.rendimiento > 0 ? this.costoTotal / this.rendimiento : 0; }
  get precioVenta(): number { return this.productos().find(p => p.idProducto === this.form.controls.idProducto.value)?.precioVenta ?? this.receta()?.producto?.precioVenta ?? 0; }
  get margen(): number | null { return this.precioVenta > 0 ? ((this.precioVenta - this.costoPorUnidad) / this.precioVenta) * 100 : null; }
  materia(id: number): MateriaPrima | undefined { return this.materias().find(m => m.idMateriaPrima === id); }
  unidadRendimiento(): string { return this.unidades().find(u => u.idUnidad === this.form.controls.idUnidad.value)?.abreviatura ?? 'unidad'; }
  costoIngrediente(i: IngredienteRecetaDto): number { return i.cantidad * (this.materia(i.idMateriaPrima)?.costoUnitario ?? 0); }
  consumoPorUnidad(i: IngredienteRecetaDto): number { return this.rendimiento > 0 ? i.cantidad / this.rendimiento : 0; }

  cargar(): void {
    this.cargando.set(true); this.error.set(null);
    forkJoin({
      productos: this.productoService.listar({ sinReceta: true, activo: true, page: 0, size: 500, sort: 'nombre,asc' }),
      unidades: this.unidadService.listar(),
      materias: this.materiaService.listar({ activo: true, page: 0, size: 500, sort: 'nombre,asc' })
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: catalogos => {
        this.productos.set(catalogos.productos.content); this.unidades.set(catalogos.unidades); this.materias.set(catalogos.materias.content);
        if (this.idReceta !== null) this.cargarReceta(this.idReceta);
        else {
          const productoId = Number(this.route.snapshot.queryParamMap.get('producto')) || null;
          if (productoId) this.form.controls.idProducto.setValue(productoId);
          this.cargando.set(false);
        }
      },
      error: (e: HttpErrorResponse) => { this.error.set(e.error?.message ?? 'No se pudieron cargar los catálogos necesarios.'); this.cargando.set(false); }
    });
  }

  reintentar(): void { this.cargar(); }
  private cargarReceta(id: number): void {
    this.service.obtener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        this.receta.set(r);
        this.form.patchValue({ idProducto: r.idProducto ?? r.producto?.idProducto ?? null, nombre: r.nombre, cantidadProducir: r.cantidadProducir, idUnidad: r.unidad?.idUnidad ?? null });
        this.ingredientes.set((r.ingredientes ?? []).map(i => ({ idMateriaPrima: i.idMateriaPrima ?? i.materiaPrima.idMateriaPrima, cantidad: i.cantidad })));
        if (r.producto && !this.productos().some(p => p.idProducto === r.producto.idProducto)) this.productos.update(ps => [...ps, r.producto]);
        this.cargando.set(false);
      }, error: (e: HttpErrorResponse) => { this.error.set(e.error?.message ?? 'No se pudo cargar la receta.'); this.cargando.set(false); }
    });
  }

  agregarIngrediente(): void {
    if (this.soloLectura) return;
    this.dialog.open(IngredienteDialogComponent, { data: { idsExcluidos: this.ingredientes().map(i => i.idMateriaPrima) }, width: '500px', maxWidth: '95vw', disableClose: true }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((i?: IngredienteRecetaDto) => { if (i) this.ingredientes.update(items => [...items, i]); });
  }

  editarIngrediente(ingrediente: IngredienteRecetaDto): void {
    if (this.soloLectura) return;
    const m = this.materia(ingrediente.idMateriaPrima);
    this.dialog.open(IngredienteDialogComponent, { data: { idsExcluidos: this.ingredientes().map(i => i.idMateriaPrima), ingrediente, nombreActual: m?.nombre }, width: '500px', maxWidth: '95vw', disableClose: true }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((i?: IngredienteRecetaDto) => { if (i) this.ingredientes.update(items => items.map(old => old.idMateriaPrima === ingrediente.idMateriaPrima ? i : old)); });
  }

  quitarIngrediente(ingrediente: IngredienteRecetaDto): void {
    if (this.soloLectura) return;
    const nombre = this.materia(ingrediente.idMateriaPrima)?.nombre ?? 'este ingrediente';
    const data: ConfirmarDialogData = { titulo: 'Quitar ingrediente', mensaje: `¿Quitar ${nombre} de esta receta? El cambio se aplicará al guardar la receta.`, textoConfirmar: 'Quitar', peligro: true };
    this.dialog.open(ConfirmarDialogComponent, { data, width: '440px' }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => { if (ok) this.ingredientes.update(items => items.filter(i => i.idMateriaPrima !== ingrediente.idMateriaPrima)); });
  }

  guardar(): void {
    if (this.soloLectura || this.guardando() || this.cargando()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (v.idProducto === null || v.idUnidad === null || v.cantidadProducir === null) return;
    const dto: CrearRecetaDto = { idProducto: v.idProducto, nombre: v.nombre.trim(), cantidadProducir: Number(v.cantidadProducir.toFixed(3)), idUnidad: v.idUnidad, ingredientes: this.ingredientes().map(i => ({ idMateriaPrima: i.idMateriaPrima, cantidad: Number(i.cantidad.toFixed(3)) })) };
    this.guardando.set(true); this.error.set(null); this.fieldErrors.set({});
    const req = this.idReceta !== null ? this.service.actualizar(this.idReceta, dto) : this.service.crear(dto);
    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.notificacion.exito(this.esEdicion ? 'Receta actualizada correctamente.' : 'Receta creada correctamente.'); void this.router.navigate(['/app/recetas']); },
      error: (e: HttpErrorResponse) => { this.guardando.set(false); this.aplicarError(e); }
    });
  }

  volver(): void {
    if (this.soloLectura || !this.form.dirty && this.ingredientes().length === (this.receta()?.ingredientes?.length ?? 0)) { void this.router.navigate(['/app/recetas']); return; }
    const data: ConfirmarDialogData = { titulo: 'Descartar cambios', mensaje: 'Hay cambios sin guardar. ¿Quieres salir y descartarlos?', textoConfirmar: 'Descartar cambios', textoCancelar: 'Seguir editando', peligro: true };
    this.dialog.open(ConfirmarDialogComponent, { data, width: '440px' }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => { if (ok) void this.router.navigate(['/app/recetas']); });
  }

  errorCampo(campo: 'idProducto' | 'nombre' | 'cantidadProducir' | 'idUnidad'): string {
    const control = this.form.controls[campo];
    if (this.fieldErrors()[campo]) return this.fieldErrors()[campo];
    if (control.hasError('required')) return campo === 'idProducto' ? 'Seleccione un producto' : campo === 'nombre' ? 'El nombre es obligatorio' : campo === 'idUnidad' ? 'Seleccione una unidad' : 'La cantidad que produce es obligatoria';
    if (control.hasError('maxlength')) return 'Máximo 100 caracteres';
    if (control.hasError('min')) return 'Debe ser mayor que cero';
    if (control.hasError('decimales')) return 'Use máximo tres decimales';
    if (control.hasError('servidor')) return control.getError('servidor') as string;
    return '';
  }

  private aplicarError(e: HttpErrorResponse): void {
    const cuerpo = e.error as { message?: string; fieldErrors?: { field: string; message: string }[] } | null;
    if (cuerpo?.fieldErrors?.length) {
      const errores: Record<string, string> = {};
      for (const fe of cuerpo.fieldErrors) { if (this.form.get(fe.field)) errores[fe.field] = fe.message; }
      this.fieldErrors.set(errores);
      for (const campo of Object.keys(errores)) this.form.get(campo)?.markAsTouched();
      this.error.set(cuerpo.message ?? 'Revisa los campos indicados.');
      return;
    }
    this.error.set(cuerpo?.message ?? 'No se pudo guardar la receta. Verifica los datos e inténtalo de nuevo.');
  }
}
