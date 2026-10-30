import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { ConfirmarDialogComponent, ConfirmarDialogData } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { FiltroBusquedaComponent } from '../../../../shared/components/filtro-busqueda/filtro-busqueda.component';
import { ColumnaTabla, TablaPaginadaComponent } from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import { Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto.service';
import { Router } from '@angular/router';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import { contarCatalogo } from '../../../../shared/utils/conteo-catalogo';

@Component({
  selector: 'app-producto-lista',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, CurrencyPipe, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatMenuModule, TablaPaginadaComponent, TablaColumnaDirective, EstadoVacioComponent, SiRolDirective, KpiCardComponent, FiltroBusquedaComponent],
  templateUrl: './producto-lista.component.html',
  styleUrl: './producto-lista.component.scss'
})
export class ProductoListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'nombre', titulo: 'Producto', ordenable: true },
    { id: 'stock', titulo: 'Stock', ordenable: true },
    { id: 'precioVenta', titulo: 'Precio', ordenable: true },
    { id: 'estado', titulo: 'Estado', ordenable: false },
    { id: 'acciones', titulo: '', ordenable: false }
  ];

  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    estado: this.fb.control<boolean | null>(true)
  });
  readonly productos = signal<Producto[]>([]);
  /** Nombres ya recibidos: alimentan el autocompletado (Trie) del buscador. */
  readonly nombresBusqueda = computed(() => this.productos().map(p => p.nombre));
  readonly total = signal(0);
  readonly kpiTotal = signal(0);
  readonly kpiActivos = signal(0);
  readonly kpiBajoStock = signal(0);
  readonly cargandoKpis = signal(true);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly filtroAplicado = signal(false);
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

    this.filtros.controls.busqueda.valueChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(busqueda => {
      this.filtroAplicado.set(!!busqueda.trim() || this.filtros.controls.estado.value !== true);
      this.pagina.set(0); this.recargar();
    });
    this.filtros.controls.estado.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(estado => {
      this.filtroAplicado.set(!!this.filtros.controls.busqueda.value.trim() || estado !== true);
      this.pagina.set(0); this.recargar();
    });
    this.recargar();
    this.cargarKpis();
  }

  recargar(): void { this.recargar$.next(); }

  /** Recarga la tabla y, además, los KPIs del catálogo (tras crear/editar/cambiar estado). */
  private recargarConKpis(): void {
    this.recargar();
    this.cargarKpis();
  }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);
    contarCatalogo(activo => this.productoService.listar({ page: 0, size: 1, activo }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ total, activos }) => {
        this.kpiTotal.set(total);
        this.kpiActivos.set(activos);
        this.productoService.listar({ page: 0, size: 1000, activo: true })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => {
            this.kpiBajoStock.set(res.content.filter(p => p.stockDisponible > 0 && p.stockDisponible <= 20).length);
            this.cargandoKpis.set(false);
          });
      });
  }

  readonly kpiTrendTotal = computed(() => '—');
  readonly kpiTrendActivos = computed(() => '—');
  readonly kpiTrendBajoStock = computed(() => '—');

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

  onPagina(evento: PageEvent): void { this.pagina.set(evento.pageIndex); this.tamano.set(evento.pageSize); this.recargar(); }
  onOrden(orden: Sort): void { this.ordenCampo.set(orden.direction ? orden.active : ''); this.ordenDireccion.set(orden.direction); this.pagina.set(0); this.recargar(); }

  limpiarFiltros(): void {
    this.filtros.setValue({ busqueda: '', estado: true });
    this.pagina.set(0);
    this.recargar();
  }

  abrirFormulario(producto?: Producto): void {
    const ruta = producto ? ['/app/productos', producto.idProducto, 'editar'] : ['/app/productos', 'nuevo'];
    void this.router.navigate(ruta);
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
          next: () => { this.notificacion.exito(activar ? 'Producto activado.' : 'Producto desactivado.'); this.recargarConKpis(); },
          error: (error: HttpErrorResponse) => this.notificacion.error(this.mensajeError(error))
        });
      });
  }

  private peticion() {
    const { busqueda, estado } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const sort = campo && this.ordenDireccion() ? `${campo},${this.ordenDireccion()}` : undefined;
    return this.productoService.listar({
      busqueda: busqueda.trim() || undefined,
      activo: estado ?? undefined,
      page: this.pagina(), size: this.tamano(), sort
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
    return error.error?.message ?? 'No se pudieron cargar los productos. Inténtalo de nuevo.';
  }
}
