import { Component, DestroyRef, inject, signal } from '@angular/core';

import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Router, RouterLink } from '@angular/router';

import {
  EMPTY,
  Subject,
  catchError,
  switchMap,
  tap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../../core/ui/notificacion.service';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { Cliente } from '../../../cliente/models/cliente.model';
import { ClienteService } from '../../../cliente/services/cliente.service';
import { EstadoPedido, Pedido } from '../../models/pedido.model';
import { PedidoService } from '../../services/pedido.service';

/**
 * Listado de pedidos (HU-16). Número, cliente, fechas, ítems, total y
 * estado. Resalta las entregas de hoy y las vencidas: es la primera
 * información que se busca al abrir la pantalla por la mañana. Lectura para
 * ADMIN/VENTAS/PRODUCCION/CONSULTA; escritura solo ADMIN/VENTAS, con `*siRol`.
 */
@Component({
  selector: 'app-pedido-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TablaPaginadaComponent,
    TablaColumnaDirective,
    SiRolDirective
  ],
  templateUrl: './pedido-lista.component.html',
  styleUrl: './pedido-lista.component.scss'
})
export class PedidoListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pedidoService = inject(PedidoService);
  private readonly clienteService = inject(ClienteService);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'id', titulo: 'N.º', ordenable: true },
    { id: 'cliente', titulo: 'Cliente', ordenable: false },
    { id: 'fechaPedido', titulo: 'Pedido', ordenable: true },
    { id: 'fechaEntrega', titulo: 'Entrega', ordenable: true },
    { id: 'cantidadItems', titulo: 'Ítems', ordenable: false },
    { id: 'totalPedido', titulo: 'Total', ordenable: false },
    { id: 'estado', titulo: 'Estado', ordenable: true },
    { id: 'acciones', titulo: '', ordenable: false }
  ];

  readonly estados: EstadoPedido[] = [
    'PENDIENTE',
    'EN_PREPARACION',
    'ENTREGADO',
    'CANCELADO'
  ];

  readonly filtros = this.crearFiltros();

  readonly pedidos = signal<Pedido[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorRango = signal(false);

  readonly clientes = signal<Cliente[]>([]);

  /** Hoy en yyyy-MM-dd, para comparar con fechaEntrega. */
  private readonly hoy = this.iso(new Date());

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
    this.recargar();
  }

  get mensajeVacio(): string {
    return this.hayFiltrosActivos()
      ? 'Ningún pedido coincide con los filtros.'
      : 'No hay pedidos registrados todavía.';
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

  nueva(): void {
    void this.router.navigate(['/app/pedidos/nueva']);
  }

  editar(pedido: Pedido): void {
    void this.router.navigate(['/app/pedidos/editar', pedido.idPedido]);
  }

  /** Entrega de un pedido aún no cerrado con fecha ya superada (🔴). */
  esVencido(pedido: Pedido): boolean {
    return (
      this.entregaPendiente(pedido) &&
      pedido.fechaEntrega !== null &&
      pedido.fechaEntrega < this.hoy
    );
  }

  /** Entrega de un pedido aún no cerrado cayendo hoy (🟡). */
  esHoy(pedido: Pedido): boolean {
    return (
      this.entregaPendiente(pedido) && pedido.fechaEntrega === this.hoy
    );
  }

  estadoTexto(estado: EstadoPedido): string {
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

  private entregaPendiente(pedido: Pedido): boolean {
    return pedido.estado === 'PENDIENTE' || pedido.estado === 'EN_PREPARACION';
  }

  private hayFiltrosActivos(): boolean {
    const { idCliente, estado, desde, hasta } = this.filtros.getRawValue();
    return idCliente !== null || estado !== null || desde !== null || hasta !== null;
  }

  private aplicarFiltros(): void {
    const { desde, hasta } = this.filtros.getRawValue();

    if (desde && hasta && desde.getTime() > hasta.getTime()) {
      this.errorRango.set(true);
      return;
    }

    this.errorRango.set(false);
    this.pagina.set(0);
    this.recargar();
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

    return this.pedidoService.listar({
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

  private aFechaApi(fecha: Date | null): string | undefined {
    if (!fecha) {
      return undefined;
    }

    return this.iso(fecha);
  }

  private iso(fecha: Date): string {
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

    return 'No se pudo cargar el listado de pedidos.';
  }

  private crearFiltros() {
    return this.fb.group({
      idCliente: this.fb.control<number | null>(null),
      estado: this.fb.control<EstadoPedido | null>(null),
      desde: this.fb.control<Date | null>(null),
      hasta: this.fb.control<Date | null>(null)
    });
  }
}
