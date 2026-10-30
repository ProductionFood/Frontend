import { DecimalPipe, formatNumber } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal, computed, LOCALE_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import { cambiosDeFiltros } from '../../../../shared/utils/filtros-debounce';
import { FiltroBusquedaComponent } from '../../../../shared/components/filtro-busqueda/filtro-busqueda.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { MateriaPrima } from '../../../materia-prima/models/materia-prima.model';
import { MateriaPrimaService } from '../../../materia-prima/services/materia-prima.service';
import { EstadoStock, InventarioMateriaPrima } from '../../models/inventario.model';
import { InventarioService } from '../../services/inventario.service';

@Component({
  selector: 'app-inventario-lista',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressBarModule,
    ReactiveFormsModule,
    RouterLink,
    EstadoVacioComponent,
    FiltroBusquedaComponent,
    KpiCardComponent,
    TablaPaginadaComponent,
    TablaColumnaDirective
  ],
  templateUrl: './inventario-lista.component.html',
  styleUrl: './inventario-lista.component.scss'
})
export class InventarioListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InventarioService);
  private readonly materiaService = inject(MateriaPrimaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  readonly columnas: ColumnaTabla[] = [
    { id: 'categoria', titulo: 'Categoría', ordenable: false },
    { id: 'cantidad', titulo: 'Cantidad', ordenable: false },
    { id: 'porcentaje', titulo: '% del total', ordenable: false }
  ];

  readonly filtros = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    soloStockBajo: false,
    incluirInactivas: false
  });

  readonly filas = signal<InventarioMateriaPrima[]>([]);
  /** Nombres ya recibidos: alimentan el autocompletado (Trie) del buscador. */
  readonly nombresBusqueda = computed(() => this.filas().map(f => f.nombre ?? f.nombreMateriaPrima ?? f.materiaPrima?.nombre));
  readonly materias = signal<MateriaPrima[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly kpiInventarioTotal = signal(0);
  readonly kpiEntradasHoy = signal(0);
  readonly kpiSalidasHoy = signal(0);
  readonly kpiAlertasActivas = signal(0);
  readonly cargandoKpis = signal(true);

  /** Inventario total formateado con el locale de la app y su unidad. */
  readonly kpiTotalTexto = computed(
    () => `${formatNumber(this.kpiInventarioTotal(), this.locale, '1.2-2')} kg`
  );

  readonly existenciasPorCategoria = computed(() => {
    const categorias: Record<string, { cantidad: number; count: number }> = {};
    let total = 0;

    for (const fila of this.filas()) {
      const categoria = this.getCategoria(fila);
      if (!categorias[categoria]) {
        categorias[categoria] = { cantidad: 0, count: 0 };
      }
      categorias[categoria].cantidad += this.disponible(fila);
      categorias[categoria].count += 1;
      total += this.disponible(fila);
    }

    return Object.entries(categorias).map(([nombre, data]) => ({
      nombre,
      cantidad: data.cantidad,
      porcentaje: total > 0 ? Math.round((data.cantidad / total) * 100) : 0
    }));
  });

  readonly alertasInventario = computed(() => {
    return this.filas()
      .filter(f => this.estado(f) !== 'OK')
      .map(f => ({
        nombre: this.nombre(f),
        estado: this.estado(f),
        cantidad: this.disponible(f),
        unidad: this.unidad(f)
      }));
  });

  private readonly ordenCampo = signal('nombreMateriaPrima');
  private readonly ordenDireccion = signal<'asc' | 'desc'>('asc');
  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.materiaService.listar({ page: 0, size: 200 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => this.materias.set(r.content),
      error: () => this.materias.set([])
    });

    this.cargarKpis();
    this.recargar$.pipe(
      tap(() => { this.cargando.set(true); this.error.set(''); }),
      switchMap(() => this.service.listar({
        page: this.pagina(),
        size: this.tamano(),
        soloStockBajo: this.filtros.controls.soloStockBajo.value || undefined,
        incluirInactivas: this.filtros.controls.incluirInactivas.value || undefined,
        sort: `${this.ordenCampo()},${this.ordenDireccion()}`
      }).pipe(catchError((e: HttpErrorResponse) => {
        this.filas.set([]);
        this.total.set(0);
        this.error.set(e.error?.message ?? 'No fue posible cargar el inventario.');
        this.cargando.set(false);
        return EMPTY;
      }))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(r => {
      this.filas.set(r.content);
      this.total.set(r.totalElements);
      this.cargando.set(false);
      this.error.set('');
    });

    cambiosDeFiltros(this.filtros).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pagina.set(0);
      this.recargar();
    });

    this.recargar();
  }

  recargar(): void { this.recargar$.next(); }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);
    this.service.listar({ page: 0, size: 500, incluirInactivas: true }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        const items = r.content;
        this.kpiInventarioTotal.set(items.reduce((sum, i) => sum + this.disponible(i), 0));
        this.kpiEntradasHoy.set(0); // TODO: backend - sumar entradas de hoy
        this.kpiSalidasHoy.set(0); // TODO: backend - sumar salidas de hoy
        this.kpiAlertasActivas.set(items.filter(i => this.estado(i) !== 'OK').length);
        this.cargandoKpis.set(false);
      },
      error: () => {
        this.kpiInventarioTotal.set(0);
        this.kpiEntradasHoy.set(0);
        this.kpiSalidasHoy.set(0);
        this.kpiAlertasActivas.set(0);
        this.cargandoKpis.set(false);
      }
    });
  }

  nombre(fila: InventarioMateriaPrima): string { return fila.materiaPrima?.nombre ?? fila.nombreMateriaPrima ?? fila.nombre ?? 'Materia prima'; }
  unidad(fila: InventarioMateriaPrima): string { return fila.materiaPrima?.unidad?.abreviatura ?? fila.unidad?.abreviatura ?? ''; }
  disponible(fila: InventarioMateriaPrima): number { return fila.disponible ?? fila.cantidadDisponible ?? 0; }
  faltante(fila: InventarioMateriaPrima): number { return fila.faltante ?? Math.max(0, fila.stockMinimo - this.disponible(fila)); }
  nivel(fila: InventarioMateriaPrima): number { return fila.stockMinimo > 0 ? Math.min(100, (this.disponible(fila) / fila.stockMinimo) * 100) : 100; }
  estado(fila: InventarioMateriaPrima): EstadoStock { if (fila.estadoStock) return fila.estadoStock; return this.disponible(fila) <= 0 ? 'AGOTADO' : this.disponible(fila) < fila.stockMinimo ? 'BAJO' : 'OK'; }

  getCategoria(fila: InventarioMateriaPrima): string {
    const nombre = this.nombre(fila).toLowerCase();
    if (nombre.includes('harina') || nombre.includes('pan') || nombre.includes('trigo')) return 'Panadería';
    if (nombre.includes('leche') || nombre.includes('lacteo') || nombre.includes('yogur') || nombre.includes('mantequilla') || nombre.includes('queso')) return 'Lácteos';
    if (nombre.includes('azucar') || nombre.includes('dulce') || nombre.includes('miel') || nombre.includes('chocolate')) return 'Repostería';
    if (nombre.includes('huevo')) return 'Panadería';
    if (nombre.includes('sal')) return 'Conservas';
    if (nombre.includes('aceite') || nombre.includes('grasa') || nombre.includes('manteca')) return 'Conservas';
    return 'General';
  }

  getCategoriaClass(categoria: string): string {
    switch (categoria) {
      case 'Panadería': return 'category panaderia';
      case 'Lácteos': return 'category lacteos';
      case 'Repostería': return 'category reposteria';
      case 'Conservas': return 'category conservas';
      default: return 'category';
    }
  }

  getAlertIcon(estado: EstadoStock): string {
    switch (estado) {
      case 'AGOTADO': return '!';
      case 'BAJO': return '⚠';
      default: return '✓';
    }
  }

  getAlertIconClass(estado: EstadoStock): string {
    switch (estado) {
      case 'AGOTADO': return 'alert-icon critical';
      case 'BAJO': return 'alert-icon medium';
      default: return 'alert-icon ok';
    }
  }

  getAlertValueClass(estado: EstadoStock): string {
    switch (estado) {
      case 'AGOTADO': return 'alert-value critical';
      case 'BAJO': return 'alert-value medium';
      default: return 'alert-value ok';
    }
  }
}