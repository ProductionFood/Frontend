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
import { Proveedor } from '../../../proveedor/models/proveedor.model';
import { ProveedorService } from '../../../proveedor/services/proveedor.service';
import { Compra, CompraPrefill, EstadoCompra } from '../../models/compra.model';
import { CompraService } from '../../services/compra.service';

/**
 * Listado de compras (HU-13). Número, proveedor, fecha, ítems, total y
 * estado. Lectura para ADMIN/COMPRAS/PRODUCCION/CONSULTA; escritura
 * (crear/editar) solo ADMIN/COMPRAS, controlada con `*siRol`.
 */
@Component({
  selector: 'app-compra-lista',
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
  templateUrl: './compra-lista.component.html',
  styleUrl: './compra-lista.component.scss'
})
export class CompraListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly compraService = inject(CompraService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columnas: ColumnaTabla[] = [
    { id: 'id', titulo: 'N.º', ordenable: true },
    { id: 'proveedor', titulo: 'Proveedor', ordenable: false },
    { id: 'fecha', titulo: 'Fecha', ordenable: true },
    { id: 'cantidadItems', titulo: 'Ítems', ordenable: false },
    { id: 'totalCompra', titulo: 'Total', ordenable: false },
    { id: 'estado', titulo: 'Estado', ordenable: true },
    { id: 'acciones', titulo: '', ordenable: false }
  ];

  readonly estados: EstadoCompra[] = ['PENDIENTE', 'RECIBIDA', 'CANCELADA'];

  readonly filtros = this.crearFiltros();

  readonly compras = signal<Compra[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorRango = signal(false);

  readonly proveedores = signal<Proveedor[]>([]);

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
              this.compras.set([]);
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
        this.compras.set(respuesta.content);
        this.total.set(respuesta.totalElements);
        this.cargando.set(false);
        this.error.set(null);
      });

    this.filtros.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());

    this.cargarProveedores();
    this.recargar();
    this.abrirSugeridaSiExiste();
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
    void this.router.navigate(['/app/compras/nueva']);
  }

  editar(compra: Compra): void {
    void this.router.navigate(['/app/compras/editar', compra.idCompra]);
  }

  /**
   * La sugerencia de compra (HU-27) navega aquí con el proveedor y los ítems
   * sugeridos: se abre el formulario prellenado una sola vez.
   */
  private abrirSugeridaSiExiste(): void {
    const estado = window.history.state as {
      compraSugerida?: CompraPrefill | null;
    } | null;

    const prefill = estado?.compraSugerida ?? null;

    if (!prefill) {
      return;
    }

    window.history.replaceState(null, '');
    void this.router.navigate(['/app/compras/nueva'], { state: { compraSugerida: prefill } });
  }

  nombreProveedor(id: number): string {
    return (
      this.proveedores().find(proveedor => proveedor.idProveedor === id)
        ?.nombre ?? ''
    );
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

  private cargarProveedores(): void {
    this.proveedorService
      .listar({ page: 0, size: 100, activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: respuesta => this.proveedores.set(respuesta.content),
        error: () => this.proveedores.set([])
      });
  }

  private peticion() {
    const { idProveedor, estado, desde, hasta } = this.filtros.getRawValue();
    const campo = this.ordenCampo();
    const direccion = this.ordenDireccion();

    return this.compraService.listar({
      page: this.pagina(),
      size: this.tamano(),
      idProveedor: idProveedor ?? undefined,
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

    return 'No se pudo cargar el listado de compras.';
  }

  private crearFiltros() {
    return this.fb.group({
      idProveedor: this.fb.control<number | null>(null),
      estado: this.fb.control<EstadoCompra | null>(null),
      desde: this.fb.control<Date | null>(null),
      hasta: this.fb.control<Date | null>(null)
    });
  }
}
