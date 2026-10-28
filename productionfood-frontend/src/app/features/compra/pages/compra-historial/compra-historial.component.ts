import { Component, DestroyRef, inject, signal } from '@angular/core';

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  EMPTY,
  Observable,
  Subject,
  forkJoin,
  map,
  catchError,
  of,
  switchMap,
  tap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../../core/auth/auth.service';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { TablaDetalleDirective } from '../../../../shared/components/tabla-paginada/tabla-detalle.directive';
import { PageResponse } from '../../../../shared/models/page-response.model';
import { Proveedor } from '../../../proveedor/models/proveedor.model';
import { ProveedorService } from '../../../proveedor/services/proveedor.service';
import {
  Compra,
  EstadoCompra,
  GastoProveedor,
  ResumenCompras
} from '../../models/compra.model';
import { DetalleCompraResponse } from '../../models/detalle-compra.model';
import { CompraService } from '../../services/compra.service';
import { DetalleCompraService } from '../../services/detalle-compra.service';
import { GastoProveedorChartComponent } from '../../components/gasto-proveedor-chart/gasto-proveedor-chart.component';
import { ResumenComprasCardsComponent } from '../../components/resumen-compras-cards/resumen-compras-cards.component';

/**
 * Historial de compras (HU-15). Consulta por proveedor, estado y rango de
 * fechas (R-02, combinados con AND). Muestra resumen y gasto por proveedor
 * (solo ADMIN/COMPRAS) y el detalle de cada compra **bajo demanda**, al
 * expandir la fila (R-06). Solo lectura: los estados se cambian en HU-13.
 */
@Component({
  selector: 'app-compra-historial',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    EstadoVacioComponent,
    TablaPaginadaComponent,
    TablaColumnaDirective,
    TablaDetalleDirective,
    ResumenComprasCardsComponent,
    GastoProveedorChartComponent
  ],
  templateUrl: './compra-historial.component.html',
  styleUrl: './compra-historial.component.scss'
})
export class CompraHistorialComponent {
  private readonly fb = inject(FormBuilder);
  private readonly compraService = inject(CompraService);
  private readonly detalleService = inject(DetalleCompraService);
  readonly proveedorService = inject(ProveedorService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  /** Los endpoints de agregación son solo ADMIN/COMPRAS (HU-15 §1). */
  readonly puedeVerAgregados = this.authService.tieneAlgunRol([
    'ADMIN',
    'COMPRAS'
  ]);

  readonly columnas: ColumnaTabla[] = [
    { id: 'id', titulo: 'N.º', ordenable: true },
    { id: 'proveedor', titulo: 'Proveedor', ordenable: false },
    { id: 'fecha', titulo: 'Fecha', ordenable: true },
    { id: 'cantidadItems', titulo: 'Ítems', ordenable: false },
    { id: 'totalCompra', titulo: 'Total', ordenable: true },
    { id: 'estado', titulo: 'Estado', ordenable: true }
  ];

  readonly estados: EstadoCompra[] = ['PENDIENTE', 'RECIBIDA', 'CANCELADA'];

  readonly mesPorDefecto = this.rangoMesActual();
  readonly filtros = this.crearFiltros();

  readonly compras = signal<Compra[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorRango = signal(false);

  readonly resumen = signal<ResumenCompras | null>(null);
  readonly gastoProveedor = signal<GastoProveedor[]>([]);
  /** `false` si los endpoints de agregación fallan: se ocultan tarjetas y gráfico. */
  readonly agregadosOk = signal(true);

  readonly proveedores = signal<Proveedor[]>([]);

  readonly expandidos = signal<Set<number>>(new Set());
  readonly detalles = signal<Record<number, DetalleCompraResponse[]>>({});
  readonly cargandoDetalle = signal<number | null>(null);
  readonly errorDetalle = signal<string | null>(null);

  private readonly ordenCampo = signal('');
  private readonly ordenDireccion = signal<'asc' | 'desc' | ''>('');

  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() => this.peticion()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ lista, resumen, gasto }) => {
          this.compras.set(lista.content);
          this.total.set(lista.totalElements);
          this.resumen.set(resumen);
          this.gastoProveedor.set(gasto);
          this.agregadosOk.set(resumen !== null);
          this.cargando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.compras.set([]);
          this.total.set(0);
          this.resumen.set(null);
          this.gastoProveedor.set([]);
          this.error.set(this.mensajeError(error));
          this.cargando.set(false);
        }
      });

    this.filtros.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());

    this.cargarProveedores();
    this.recargar();
  }

  recargar(): void {
    this.recargar$.next();
  }

  onPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.recargar();
  }

  onOrden(orden: Sort): void {
    this.ordenCampo.set(orden.direction ? orden.active : '');
    this.ordenDireccion.set(orden.direction);
    this.pagina.set(0);
    this.recargar();
  }

  limpiarFiltros(): void {
    this.filtros.patchValue({
      idProveedor: null,
      estado: null,
      desde: this.mesPorDefecto.desde,
      hasta: this.mesPorDefecto.hasta
    });
  }

  esExpandida(compra: Compra): boolean {
    return this.expandidos().has(compra.idCompra);
  }

  /** Carga el detalle de la compra al expandir la fila (R-06), una sola vez. */
  alternar(compra: Compra): void {
    const idCompra = compra.idCompra;
    const expandidos = new Set(this.expandidos());

    if (expandidos.has(idCompra)) {
      expandidos.delete(idCompra);
      this.expandidos.set(expandidos);
      return;
    }

    expandidos.add(idCompra);
    this.expandidos.set(expandidos);

    if (this.detalles()[idCompra] === undefined) {
      this.cargarDetalle(idCompra);
    }
  }

  detalleDe(idCompra: number): DetalleCompraResponse[] {
    return this.detalles()[idCompra] ?? [];
  }

  hayFiltrosActivos(): boolean {
    const { idProveedor, estado, desde, hasta } = this.filtros.getRawValue();

    return (
      idProveedor !== null ||
      estado !== null ||
      desde?.getTime() !== this.mesPorDefecto.desde.getTime() ||
      hasta?.getTime() !== this.mesPorDefecto.hasta.getTime()
    );
  }

  textoEstado(estado: EstadoCompra): string {
    return estado === 'PENDIENTE'
      ? 'Pendiente'
      : estado === 'RECIBIDA'
        ? 'Recibida'
        : 'Cancelada';
  }

  private cargarDetalle(idCompra: number): void {
    this.cargandoDetalle.set(idCompra);
    this.errorDetalle.set(null);

    this.detalleService
      .listar(idCompra)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => {
          this.detalles.update(detalles => ({
            ...detalles,
            [idCompra]: respuesta.detalles
          }));
          this.cargandoDetalle.set(null);
        },
        error: (error: HttpErrorResponse) => {
          this.errorDetalle.set(this.mensajeError(error));
          this.cargandoDetalle.set(null);
        }
      });
  }

  private aplicarFiltros(): void {
    const { desde, hasta } = this.filtros.getRawValue();

    if (desde && hasta && desde.getTime() > hasta.getTime()) {
      this.errorRango.set(true);
      return;
    }

    this.errorRango.set(false);
    this.pagina.set(0);
    this.expandidos.set(new Set());
    this.recargar();
  }

  private cargarProveedores(): void {
    this.proveedorService
      .listar({ page: 0, size: 100, activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => this.proveedores.set(respuesta.content),
        error: () => this.proveedores.set([])
      });
  }

  private peticion(): Observable<{
    lista: PageResponse<Compra>;
    resumen: ResumenCompras | null;
    gasto: GastoProveedor[];
  }> {
    const { idProveedor, estado, desde, hasta } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const direccion = this.ordenDireccion();

    const periodo = {
      fechaInicio: this.aFechaApi(desde),
      fechaFin: this.aFechaApi(hasta)
    };

    const lista$ = this.compraService.listar({
      page: this.pagina(),
      size: this.tamano(),
      idProveedor: idProveedor ?? undefined,
      estado: estado ?? undefined,
      ...periodo,
      sort:
        campo && (direccion === 'asc' || direccion === 'desc')
          ? `${campo},${direccion}`
          : undefined
    });

    // Las tres consultas son independientes: se lanzan en paralelo. Un fallo
    // en los agregados no tumba la lista (R-06: el listado es lo esencial).
    if (!this.puedeVerAgregados) {
      return lista$.pipe(
        map(lista => ({ lista, resumen: null, gasto: [] }))
      );
    }

    return forkJoin({
      lista: lista$,
      resumen: this.compraService.resumen(periodo).pipe(
        catchError(() => of(null))
      ),
      gasto: this.compraService.gastoPorProveedor(periodo).pipe(
        catchError(() => of([] as GastoProveedor[]))
      )
    });
  }

  private rangoMesActual(): { desde: Date; hasta: Date } {
    const hoy = new Date();

    return {
      desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
      hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    };
  }

  private aFechaApi(fecha: Date | null): string | undefined {
    if (!fecha) {
      return undefined;
    }

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private mensajeError(error: HttpErrorResponse): string {
    const cuerpo = error.error as { message?: string } | null;

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cargar el historial de compras.';
  }

  private crearFiltros() {
    return this.fb.group({
      idProveedor: this.fb.control<number | null>(null),
      estado: this.fb.control<EstadoCompra | null>(null),
      desde: this.fb.control<Date | null>(
        this.fechaDeQuery('fechaInicio', this.mesPorDefecto.desde)
      ),
      hasta: this.fb.control<Date | null>(
        this.fechaDeQuery('fechaFin', this.mesPorDefecto.hasta)
      )
    });
  }

  /** Período enviado por el hub de reportes (`?fechaInicio=&fechaFin=`). */
  private fechaDeQuery(nombre: string, porDefecto: Date): Date {
    const valor = this.route.snapshot.queryParamMap.get(nombre);

    if (!valor) {
      return porDefecto;
    }

    const [anio, mes, dia] = valor.split('-').map(Number);

    if (!anio || !mes || !dia) {
      return porDefecto;
    }

    return new Date(anio, mes - 1, dia);
  }
}
