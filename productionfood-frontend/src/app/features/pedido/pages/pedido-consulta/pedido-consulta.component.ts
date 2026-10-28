import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

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
  Subject,
  catchError,
  finalize,
  forkJoin,
  of,
  switchMap,
  tap
} from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { TablaDetalleDirective } from '../../../../shared/components/tabla-paginada/tabla-detalle.directive';
import { Cliente } from '../../../cliente/models/cliente.model';
import { ClienteService } from '../../../cliente/services/cliente.service';
import { ProductosVendidosTablaComponent } from '../../components/productos-vendidos-tabla/productos-vendidos-tabla.component';
import { ResumenVentasCardsComponent } from '../../components/resumen-ventas-cards/resumen-ventas-cards.component';
import { VentasClienteChartComponent } from '../../components/ventas-cliente-chart/ventas-cliente-chart.component';
import {
  EstadoPedido,
  LineaPedido,
  PedidoConsulta,
  ProductoVendido,
  ResumenPedidos,
  VentaCliente
} from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';

/**
 * Consulta de pedidos (HU-25). Amplía los filtros del listado de HU-16 con
 * resumen de ventas, ventas por cliente y ranking de productos. Solo lectura:
 * los estados se cambian en HU-16. El detalle de cada pedido se carga al
 * expandir la fila (R-06) y las agregaciones se ocultan a los roles sin
 * permiso (solo ADMIN/VENTAS).
 */
@Component({
  selector: 'app-pedido-consulta',
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
    ResumenVentasCardsComponent,
    VentasClienteChartComponent,
    ProductosVendidosTablaComponent
  ],
  templateUrl: './pedido-consulta.component.html',
  styleUrl: './pedido-consulta.component.scss'
})
export class PedidoConsultaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pedidoService = inject(PedidoService);
  private readonly clienteService = inject(ClienteService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  /** Los endpoints de agregación son solo ADMIN/VENTAS (HU-25 §2). */
  readonly puedeVerAgregados = this.authService.tieneAlgunRol([
    'ADMIN',
    'VENTAS'
  ]);

  readonly columnas: ColumnaTabla[] = [
    { id: 'id', titulo: 'N.º', ordenable: true },
    { id: 'cliente', titulo: 'Cliente', ordenable: false },
    { id: 'fechaPedido', titulo: 'Pedido', ordenable: true },
    { id: 'fechaEntrega', titulo: 'Entrega', ordenable: true },
    { id: 'totalBruto', titulo: 'Bruto', ordenable: true, clase: 'numerica' },
    { id: 'devoluciones', titulo: 'Devol.', ordenable: false, clase: 'numerica' },
    { id: 'totalNeto', titulo: 'Neto', ordenable: false, clase: 'numerica' },
    { id: 'estado', titulo: 'Estado', ordenable: true }
  ];

  readonly estados: EstadoPedido[] = [
    'PENDIENTE',
    'EN_PREPARACION',
    'ENTREGADO',
    'CANCELADO'
  ];

  readonly mesPorDefecto = this.rangoMesActual();
  readonly filtros = this.crearFiltros();

  readonly pedidos = signal<PedidoConsulta[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorRango = signal(false);

  readonly resumen = signal<ResumenPedidos | null>(null);
  readonly errorResumen = signal(false);
  readonly ventasCliente = signal<VentaCliente[]>([]);
  readonly errorVentas = signal(false);
  readonly productos = signal<ProductoVendido[]>([]);
  readonly errorProductos = signal(false);
  readonly cargandoAgregados = signal(false);

  readonly clientes = signal<Cliente[]>([]);

  readonly expandidos = signal<Set<number>>(new Set());
  readonly detalles = signal<Record<number, LineaPedido[]>>({});
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
        switchMap(() =>
          this.peticion().pipe(
            catchError((error: HttpErrorResponse) => {
              this.pedidos.set([]);
              this.total.set(0);
              this.error.set(this.mensajeError(error));
              this.cargando.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(respuesta => {
        this.pedidos.set(respuesta.content);
        this.total.set(respuesta.totalElements);
        this.cargando.set(false);
        this.error.set(null);
      });

    this.filtros.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());

    this.cargarClientes();
    this.aplicarFiltros();
  }

  recargar(): void {
    this.recargar$.next();
  }

  cargarAgregados(): void {
    if (!this.puedeVerAgregados) {
      return;
    }

    const periodo = this.periodoApi();
    this.cargandoAgregados.set(true);

    forkJoin({
      resumen: this.pedidoService
        .resumen(periodo)
        .pipe(catchError(() => of(null))),
      ventas: this.pedidoService
        .ventasPorCliente(periodo)
        .pipe(catchError(() => of(null))),
      productos: this.pedidoService
        .productosMasVendidos(periodo)
        .pipe(catchError(() => of(null)))
    })
      .pipe(
        finalize(() => this.cargandoAgregados.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ resumen, ventas, productos }) => {
        this.errorResumen.set(resumen === null);
        this.resumen.set(resumen);
        this.errorVentas.set(ventas === null);
        this.ventasCliente.set(ventas ?? []);
        this.errorProductos.set(productos === null);
        this.productos.set(productos ?? []);
      });
  }

  onPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.recargar();
  }

  onOrden(orden: Sort): void {
    this.ordenCampo.set(
      orden.direction ? this.campoOrden(orden.active) : ''
    );
    this.ordenDireccion.set(orden.direction);
    this.pagina.set(0);
    this.recargar();
  }

  limpiarFiltros(): void {
    this.filtros.patchValue({
      idCliente: null,
      estado: null,
      desde: this.mesPorDefecto.desde,
      hasta: this.mesPorDefecto.hasta
    });
  }

  esExpandida(pedido: PedidoConsulta): boolean {
    return this.expandidos().has(pedido.idPedido);
  }

  /** Carga el detalle del pedido al expandir la fila (R-06), una sola vez. */
  alternar(pedido: PedidoConsulta): void {
    const idPedido = pedido.idPedido;
    const expandidos = new Set(this.expandidos());

    if (expandidos.has(idPedido)) {
      expandidos.delete(idPedido);
      this.expandidos.set(expandidos);
      return;
    }

    expandidos.add(idPedido);
    this.expandidos.set(expandidos);

    if (this.detalles()[idPedido] === undefined) {
      this.cargarDetalle(idPedido);
    }
  }

  detalleDe(idPedido: number): LineaPedido[] {
    return this.detalles()[idPedido] ?? [];
  }

  hayFiltrosActivos(): boolean {
    const { idCliente, estado, desde, hasta } = this.filtros.getRawValue();

    return (
      idCliente !== null ||
      estado !== null ||
      desde?.getTime() !== this.mesPorDefecto.desde.getTime() ||
      hasta?.getTime() !== this.mesPorDefecto.hasta.getTime()
    );
  }

  textoEstado(estado: EstadoPedido): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_PREPARACION':
        return 'En preparación';
      case 'ENTREGADO':
        return 'Entregado';
      case 'CANCELADO':
        return 'Cancelado';
    }
  }

  private cargarDetalle(idPedido: number): void {
    this.cargandoDetalle.set(idPedido);
    this.errorDetalle.set(null);

    this.pedidoService
      .obtener(idPedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pedido => {
          this.detalles.update(detalles => ({
            ...detalles,
            [idPedido]: pedido.detalle ?? []
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
    this.cargarAgregados();
  }

  private cargarClientes(): void {
    this.clienteService
      .listar({ page: 0, size: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => this.clientes.set(respuesta.content),
        error: () => this.clientes.set([])
      });
  }

  private peticion() {
    const { idCliente, estado, desde, hasta } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const direccion = this.ordenDireccion();

    return this.pedidoService.listar<PedidoConsulta>({
      page: this.pagina(),
      size: this.tamano(),
      idCliente: idCliente ?? undefined,
      estado: estado ?? undefined,
      fechaInicio: this.aFechaApi(desde),
      fechaFin: this.aFechaApi(hasta),
      sort:
        campo && (direccion === 'asc' || direccion === 'desc')
          ? `${campo},${direccion}`
          : undefined
    });
  }

  private periodoApi(): { fechaInicio?: string; fechaFin?: string } {
    const { desde, hasta } = this.filtros.getRawValue();

    return {
      fechaInicio: this.aFechaApi(desde),
      fechaFin: this.aFechaApi(hasta)
    };
  }

  /** El backend ordena por `total`; la columna muestra el bruto (R-02). */
  private campoOrden(activo: string): string {
    return activo === 'totalBruto' ? 'total' : activo;
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
    const cuerpo = error.error as { code?: string; message?: string } | null;

    if (cuerpo?.code === 'RANGO_FECHAS_INVALIDO') {
      return 'La fecha inicial no puede ser posterior a la final.';
    }

    if (cuerpo && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }

    return 'No se pudo cargar la consulta de pedidos.';
  }

  private crearFiltros() {
    return this.fb.group({
      idCliente: this.fb.control<number | null>(null),
      estado: this.fb.control<EstadoPedido | null>(null),
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
