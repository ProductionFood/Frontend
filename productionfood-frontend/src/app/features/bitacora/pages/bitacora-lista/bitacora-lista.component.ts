import { Component, DestroyRef, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageEvent } from '@angular/material/paginator';

import { Subject, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BitacoraRegistro } from '../../models/bitacora.model';
import { BitacoraService } from '../../services/bitacora.service';
import {
  ColumnaTabla,
  TablaPaginadaComponent
} from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';

/**
 * Catálogo de acciones de fallback (R-06 de HU-04) mientras
 * `GET /bitacora/acciones` esté disponible. Cuando el endpoint responda, se
 * usa ese catálogo y este listado queda solo como respaldo.
 */
const ACCIONES_CONOCIDAS = [
  'CREAR',
  'EDITAR',
  'CAMBIAR_ESTADO',
  'ELIMINAR',
  'LOGIN',
  'LOGIN_FALLIDO',
  'RECEPCION_COMPRA',
  'APROBAR_DEVOLUCION',
  'REGISTRAR_CONSUMO'
];

/** Tablas auditables del sistema (R-06). */
const TABLAS_CONOCIDAS = [
  'usuarios',
  'clientes',
  'proveedores',
  'materias_primas',
  'productos',
  'recetas',
  'planes_produccion',
  'pedidos',
  'compras',
  'inventario'
];

/**
 * Consulta de bitácora de auditoría (HU-04). Solo lectura, solo ADMIN
 * (CA-04). Reutiliza `app-tabla-paginada` y el `confirmar-dialog` no aplica:
 * esta pantalla no tiene acciones de escritura.
 */
@Component({
  selector: 'app-bitacora-lista',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TablaPaginadaComponent,
    TablaColumnaDirective
  ],
  templateUrl: './bitacora-lista.component.html',
  styleUrl: './bitacora-lista.component.scss'
})
export class BitacoraListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly bitacoraService = inject(BitacoraService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tablas = TABLAS_CONOCIDAS;

  readonly columnas: ColumnaTabla[] = [
    { id: 'fecha', titulo: 'Fecha', ordenable: false },
    { id: 'usuario', titulo: 'Usuario', ordenable: false },
    { id: 'accion', titulo: 'Acción', ordenable: false },
    { id: 'tabla', titulo: 'Tabla', ordenable: false },
    { id: 'detalle', titulo: 'Detalle', ordenable: false }
  ];

  readonly filtros = this.crearFiltros();

  readonly registros = signal<BitacoraRegistro[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly tamano = signal(20);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorRango = signal(false);
  readonly acciones = signal<string[]>(ACCIONES_CONOCIDAS);

  private readonly recargar$ = new Subject<void>();

  constructor() {
    this.recargar$
      .pipe(
        switchMap(() => this.peticion()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {
          this.registros.set(respuesta.content);
          this.total.set(respuesta.totalElements);
          this.cargando.set(false);
          this.error.set(null);
        },
        error: (error: HttpErrorResponse) => {
          this.registros.set([]);
          this.cargando.set(false);
          this.error.set(this.mensajeError(error));
        }
      });

    this.filtros.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());

    this.cargarAcciones();
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

  claseAccion(accion: string): string {
    switch (accion) {
      case 'CREAR':
        return 'accion-crear';
      case 'EDITAR':
        return 'accion-editar';
      case 'CAMBIAR_ESTADO':
        return 'accion-estado';
      case 'ELIMINAR':
      case 'LOGIN_FALLIDO':
        return 'accion-peligro';
      default:
        return 'accion-neutro';
    }
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

  private peticion() {
    this.cargando.set(true);
    this.error.set(null);

    const { desde, hasta, accion, tabla } = this.filtros.getRawValue();

    return this.bitacoraService.listar({
      page: this.pagina(),
      size: this.tamano(),
      accion: accion ?? undefined,
      tabla: tabla ?? undefined,
      fechaInicio: this.aFechaApi(desde),
      fechaFin: this.aFechaApi(hasta)
    });
  }

  private cargarAcciones(): void {
    this.bitacoraService
      .listarAcciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: acciones =>
          this.acciones.set(acciones.length ? acciones : ACCIONES_CONOCIDAS),
        error: () => this.acciones.set(ACCIONES_CONOCIDAS)
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

    return 'No se pudo cargar la bitácora.';
  }

  private crearFiltros() {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(hasta.getDate() - 7);

    return this.fb.group({
      desde: this.fb.control<Date | null>(desde),
      hasta: this.fb.control<Date | null>(hasta),
      accion: this.fb.control<string | null>(null),
      tabla: this.fb.control<string | null>(null)
    });
  }
}
