import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { ColumnaTabla, TablaPaginadaComponent } from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';
import { ProductoFormularioComponent } from '../producto-formulario/producto-formulario.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import { contarCatalogo } from '../../../../shared/utils/conteo-catalogo';

@Component({
  selector: 'app-producto-lista',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, CurrencyPipe, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatMenuModule, MatTooltipModule, TablaPaginadaComponent, TablaColumnaDirective, SiRolDirective, KpiCardComponent],
  templateUrl: './producto-lista.component.html',
  styleUrl: './producto-lista.component.scss'
})
export class ProductoListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'seleccion', titulo: '', ordenable: false },
    { id: 'nombre', titulo: 'Producto', ordenable: true },
    { id: 'stock', titulo: 'Stock', ordenable: true },
    { id: 'precioVenta', titulo: 'Precio', ordenable: true },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'acciones', titulo: '', ordenable: false }
  ];

  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    estado: this.fb.control<'todos' | 'activo' | 'bajo-stock' | 'inactivo'>('activo'),
    categoria: this.fb.control<'todas' | 'panaderia' | 'lacteos' | 'reposteria' | 'conservas'>('todas')
  });
  readonly productos = signal<Producto[]>([]);
  readonly total = signal(0);
  readonly kpiTotal = signal(0);
  readonly kpiActivos = signal(0);
  readonly kpiInactivos = signal(0);
  readonly kpiBajoStock = signal(0);
  readonly cargandoKpis = signal(true);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  private readonly ordenCampo = signal('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');
  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(null); }),
      switchMap(() => this.peticion().pipe(catchError((error: HttpErrorResponse) => {
        this.productos.set([]); this.total.set(0); this.error.set(this.mensajeError(error)); this.cargando.set(false); return EMPTY;
      }))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(respuesta => {
      this.productos.set(respuesta.content);
      this.total.set(respuesta.totalElements);
      this.cargando.set(false);
      this.error.set(null);
    });

    this.filtros.controls.busqueda.valueChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pagina.set(0); this.recargar();
    });
    this.filtros.controls.estado.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pagina.set(0); this.recargar();
    });
    this.filtros.controls.categoria.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pagina.set(0); this.recargar();
    });
    this.recargar();
  }

  recargar(): void { this.recargar$.next(); this.cargarKpis(); }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);
    contarCatalogo(activo => this.productoService.listar({ page: 0, size: 1, activo }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ total, activos, inactivos }) => {
        this.kpiTotal.set(total);
        this.kpiActivos.set(activos);
        this.kpiInactivos.set(inactivos);
        // Calcular bajo stock: productos con stock <= 20
        this.productoService.listar({ page: 0, size: 1000, activo: true })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => {
            const bajoStock = res.content.filter(p => p.stockDisponible > 0 && p.stockDisponible <= 20).length;
            this.kpiBajoStock.set(bajoStock);
            this.cargandoKpis.set(false);
          });
      });
  }

  readonly kpiTrendTotal = computed(() => '—');
  readonly kpiTrendActivos = computed(() => '—');
  readonly kpiTrendInactivos = computed(() => '—');
  readonly kpiTrendBajoStock = computed(() => '—');

  // TODO: Requiere backend con filtro por fecha (fechaCreacion en Producto + filtro fechaDesde/fechaHasta en listar)
  // private async cargarTendencias(): Promise<void> {
  //   const ahora = new Date();
  //   const mesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  //   const finMesPasado = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
  //   // const totalMesActual = await this.contarDesde(ahora);
  //   // const totalMesPasado = await this.contarDesde(mesPasado, finMesPasado);
  //   // this.calcularTendencia(totalMesActual, totalMesPasado);
  // }

  categoriaIcono(producto: Producto): string {
    const nombre = producto.nombre.toLowerCase();
    if (nombre.includes('pan') || nombre.includes('integral')) return 'pan';
    if (nombre.includes('galleta') || nombre.includes('torta') || nombre.includes('chocolate')) return 'reposteria';
    if (nombre.includes('yogur') || nombre.includes('leche') || nombre.includes('queso') || nombre.includes('mozzarella')) return 'lacteos';
    if (nombre.includes('mermelada') || nombre.includes('salsa') || nombre.includes('conserva')) return 'conservas';
    return 'pan';
  }

  categoriaIconoMat(producto: Producto): string {
    const cat = this.categoriaIcono(producto);
    switch (cat) {
      case 'pan': return 'bakery_dining';
      case 'reposteria': return 'cake';
      case 'lacteos': return 'local_drink';
      case 'conservas': return 'jar';
      default: return 'inventory_2';
    }
  }

  stockPorcentaje(producto: Producto): number {
    // Porcentaje visual basado en stock disponible (simplificado)
    if (producto.stockDisponible === 0) return 0;
    if (producto.stockDisponible <= 20) return 30;
    if (producto.stockDisponible <= 50) return 50;
    if (producto.stockDisponible <= 100) return 70;
    return 100;
  }

  estadoClase(producto: Producto): string {
    if (!producto.activo) return 'inactivo';
    if (producto.stockDisponible === 0) return 'agotado';
    if (producto.stockDisponible <= 20) return 'bajo-stock';
    return 'activo';
  }

  onPagina(evento: import('@angular/material/paginator').PageEvent): void { this.pagina.set(evento.pageIndex); this.tamano.set(evento.pageSize); this.recargar(); }
  onOrden(orden: import('@angular/material/sort').Sort): void { this.ordenCampo.set(orden.direction ? orden.active : ''); this.ordenDireccion.set(orden.direction); this.pagina.set(0); this.recargar(); }

  mensajeVacio(): string {
    const busqueda = this.filtros.controls.busqueda.value.trim();
    if (busqueda) return `Ningún producto coincide con «${busqueda}».`;
    return 'No hay productos registrados.';
  }

  abrirFormulario(producto?: Producto): void {
    this.dialog.open(ProductoFormularioComponent, {
      data: { producto }, width: '620px', maxWidth: '95vw', autoFocus: 'first-tabbable', disableClose: true
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(resultado => {
      if (resultado === true) {
        this.notificacion.exito(producto ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
        this.recargar();
      }
    });
  }

  cambiarEstado(producto: Producto): void {
    const activar = !producto.activo;
    const mensaje = activar
      ? `¿Activar «${producto.nombre}»? Volverá a estar disponible para nuevas ventas.`
      : producto.stockDisponible > 0
        ? `Este producto tiene ${producto.stockDisponible} unidades en estante. Desactivarlo impedirá nuevas ventas, pero el stock se conserva. ¿Deseas continuar?`
        : `¿Desactivar «${producto.nombre}»? No estará disponible para nuevas ventas.`;
    const data: ConfirmarDialogData = {
      titulo: activar ? 'Activar producto' : 'Desactivar producto',
      mensaje,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar
    };
    this.dialog.open(ConfirmarDialogComponent, { data, width: '480px', autoFocus: 'dialog' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmado => {
        if (!confirmado) return;
        this.productoService.cambiarEstado(producto.idProducto, activar).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => { this.notificacion.exito(activar ? 'Producto activado.' : 'Producto desactivado.'); this.recargar(); },
          error: (error: HttpErrorResponse) => this.notificacion.error(this.mensajeError(error))
        });
      });
  }

  private peticion() {
    const { busqueda, estado, categoria } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const sort = campo && this.ordenDireccion() ? `${campo},${this.ordenDireccion()}` : undefined;
    let activo: boolean | undefined;
    if (estado === 'activo') activo = true;
    else if (estado === 'inactivo') activo = false;
    // 'todos' and 'bajo-stock' don't filter by activo
    return this.productoService.listar({
      busqueda: busqueda.trim() || undefined,
      activo,
      sinReceta: undefined,
      page: this.pagina(), size: this.tamano(), sort
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
    return error.error?.message ?? 'No se pudieron cargar los productos. Inténtalo de nuevo.';
  }
}
