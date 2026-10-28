import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { AuthService } from '../../../../core/auth/auth.service';
import { EstadoPlan, PlanProduccion } from '../../models/plan-produccion.model';
import { PlanProduccionService } from '../../services/plan-produccion.service';
import { EstadoVacioComponent } from '../../../../shared/components/estado-vacio/estado-vacio.component';
import { FiltroBusquedaComponent } from '../../../../shared/components/filtro-busqueda/filtro-busqueda.component';
import { TarjetaTablaComponent } from '../../../../shared/components/tarjeta-tabla/tarjeta-tabla.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import { ColumnaTabla, TablaPaginadaComponent } from '../../../../shared/components/tabla-paginada/tabla-paginada.component';
import { TablaColumnaDirective } from '../../../../shared/components/tabla-paginada/tabla-columna.directive';
import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';

@Component({
  selector: 'app-plan-lista',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    EstadoVacioComponent,
    FiltroBusquedaComponent,
    TarjetaTablaComponent,
    KpiCardComponent,
    TablaPaginadaComponent,
    TablaColumnaDirective,
    SiRolDirective
  ],
  templateUrl: './plan-lista.component.html',
  styleUrl: './plan-lista.component.scss'
})
export class PlanListaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PlanProduccionService);
  private readonly destroy = inject(DestroyRef);
  readonly auth = inject(AuthService);

  readonly filtro = this.fb.group({
    busqueda: this.fb.nonNullable.control(''),
    estado: this.fb.control<EstadoPlan | null>(null)
  });

  readonly columnas: ColumnaTabla[] = [
    { id: 'plan', titulo: 'Plan', ordenable: false },
    { id: 'productoPrincipal', titulo: 'Producto', ordenable: true },
    { id: 'fechaPlanificacion', titulo: 'Fecha planificación', ordenable: true },
    { id: 'fechaProduccion', titulo: 'Producción', ordenable: true },
    { id: 'cantidad', titulo: 'Cantidad', ordenable: false },
    { id: 'progreso', titulo: 'Progreso', ordenable: false },
    { id: 'estado', titulo: 'Estado', ordenable: true },
    { id: 'acciones', titulo: 'Acciones', ordenable: false }
  ];

  readonly datos = signal<PlanProduccion[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly sort = signal('fechaProduccion,desc');

  readonly kpiTotal = computed(() => this.total());
  readonly kpiEnProceso = computed(() => this.datos().filter(p => p.estado === 'EN_PROCESO').length);
  readonly kpiPendientes = computed(() => this.datos().filter(p => p.estado === 'PLANIFICADO').length);
  readonly kpiCompletados = computed(() => this.datos().filter(p => p.estado === 'COMPLETADO').length);

  readonly kpiTrendTotal = computed(() => '—');
  readonly kpiTrendEnProceso = computed(() => '—');
  readonly kpiTrendPendientes = computed(() => '—');
  readonly kpiTrendCompletados = computed(() => '—');

  constructor() {
    this.filtro.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.page.set(0);
      this.cargar();
    });
    this.cargar();
  }

  private iso(d: Date | null): string | undefined {
    return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined;
  }

  limpiarFiltros(): void {
    this.filtro.reset({ busqueda: '', estado: null });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    const f = this.filtro.getRawValue();
    this.service.listar({
      page: this.page(),
      size: this.size(),
      estado: f.estado ?? undefined,
      busqueda: f.busqueda.trim() || undefined,
      sort: this.sort()
    }).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: r => {
        this.datos.set(r.content);
        this.total.set(r.totalElements);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.status === 404
          ? 'El servicio de planes de producción no está disponible (HTTP 404). Verifique que el backend implemente GET /api/v1/planes-produccion.'
          : (typeof e.error?.message === 'string' ? e.error.message : 'No se pudieron cargar los planes. Compruebe la conexión con el servidor.'));
        this.cargando.set(false);
      }
    });
  }

  cambiarPagina(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
    this.cargar();
  }

  ordenar(e: Sort): void {
    this.sort.set(e.direction ? `${e.active},${e.direction}` : 'fechaProduccion,desc');
    this.cargar();
  }

  hoy(p: PlanProduccion): boolean {
    const d = new Date();
    return p.fechaProduccion === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  avance(p: PlanProduccion): number {
    const det = p.detalles ?? [];
    const total = det.reduce((s, l) => s + l.cantidadPlanificada, 0);
    return total ? Math.min(100, Math.round(det.reduce((s, l) => s + l.cantidadProducida, 0) * 100 / total)) : 0;
  }

  estadoClase(estado: EstadoPlan): string {
    switch (estado) {
      case 'PLANIFICADO': return 'pendiente';
      case 'EN_PROCESO': return 'proceso';
      case 'COMPLETADO': return 'completado';
      case 'CANCELADO': return 'cancelado';
      default: return 'pendiente';
    }
  }

  textoEstado(estado: EstadoPlan): string {
    switch (estado) {
      case 'PLANIFICADO': return 'Pendiente';
      case 'EN_PROCESO': return 'En proceso';
      case 'COMPLETADO': return 'Completado';
      case 'CANCELADO': return 'Cancelado';
      default: return 'Pendiente';
    }
  }
}