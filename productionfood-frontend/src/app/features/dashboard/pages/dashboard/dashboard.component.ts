import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { catchError, filter, finalize, fromEvent, of } from 'rxjs';

import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { TarjetaComprasComponent } from '../../components/tarjeta-compras/tarjeta-compras.component';
import { TarjetaPedidosComponent } from '../../components/tarjeta-pedidos/tarjeta-pedidos.component';
import { TarjetaProduccionComponent } from '../../components/tarjeta-produccion/tarjeta-produccion.component';
import { TarjetaStockComponent } from '../../components/tarjeta-stock/tarjeta-stock.component';
import { TarjetaVencimientosComponent } from '../../components/tarjeta-vencimientos/tarjeta-vencimientos.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import { ProduccionChartComponent, ProduccionDia } from '../../components/produccion-chart/produccion-chart.component';
import { PlanesDonutComponent } from '../../components/planes-donut/planes-donut.component';
import { PlanReciente, PlanesTablaComponent } from '../../components/planes-tabla/planes-tabla.component';
import { AlertasInventarioComponent } from '../../components/alertas-inventario/alertas-inventario.component';
import { ConteosDashboard, DashboardResumen, ResumenPorVencer } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';
import { PlanProduccion } from '../../../produccion/models/plan-produccion.model';

/** yyyy-MM-dd en hora local (toISOString usaría UTC y puede cambiar el día). */
function aFechaIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Dashboard resumen del día (HU-24). El resumen principal alimenta cuatro
 * tarjetas y los vencimientos se consultan aparte: si esa consulta se demora,
 * las demás ya están visibles (R-04). Sin caché ni auto-refresco agresivo: se
 * recarga a mano o al volver a la pestaña.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    KpiCardComponent,
    SiRolDirective,
    TarjetaComprasComponent,
    TarjetaPedidosComponent,
    TarjetaProduccionComponent,
    TarjetaStockComponent,
    TarjetaVencimientosComponent,
    ProduccionChartComponent,
    PlanesDonutComponent,
    PlanesTablaComponent,
    AlertasInventarioComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly resumen = signal<DashboardResumen | null>(null);
  readonly cargandoResumen = signal(true);
  readonly errorResumen = signal(false);

  readonly porVencer = signal<ResumenPorVencer | null>(null);
  readonly cargandoVencimientos = signal(true);
  readonly errorVencimientos = signal(false);

  readonly actualizadoEn = signal<Date | null>(null);
  readonly conteos = signal<ConteosDashboard | null>(null);
  readonly cargandoConteos = signal(true);

  readonly planesSemana = signal<PlanProduccion[]>([]);
  readonly ultimosPlanes = signal<PlanProduccion[]>([]);

  /** Fecha del servidor (`curdate`, R-01); nunca la del navegador. */
  readonly fechaMostrada = computed(() => {
    const fecha = this.resumen()?.fecha;

    if (!fecha) {
      return new Date();
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);

    if (!anio || !mes || !dia) {
      return new Date();
    }

    return new Date(anio, mes - 1, dia);
  });

  /** Planes de los últimos 7 días (fecha del servidor) para el gráfico. */
  readonly produccionChart = computed<ProduccionDia[]>(() => {
    if (!this.resumen()) return [];

    const hoy = this.fechaMostrada();
    const dias = new Map<string, ProduccionDia>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const fecha = aFechaIso(d);
      dias.set(fecha, { fecha, planificada: 0, producida: 0 });
    }

    for (const plan of this.planesSemana()) {
      const dia = dias.get(plan.fechaProduccion);
      if (!dia || plan.estado === 'CANCELADO') continue;

      dia.planificada++;
      if (plan.estado === 'COMPLETADO') dia.producida++;
    }

    return [...dias.values()];
  });

  readonly planesRecientes = computed<PlanReciente[]>(() =>
    this.ultimosPlanes().map(plan => ({
      idPlanProduccion: plan.idPlanProduccion,
      producto: plan.productoPrincipal ?? '—',
      fechaProduccion: plan.fechaProduccion,
      fechaFin: plan.fechaProduccion,
      estado: plan.estado,
      cantidad: plan.cantidadProductos ?? plan.detalles?.length ?? 0
    }))
  );

  readonly planesEstado = computed(() => {
    const prod = this.resumen()?.produccionHoy;
    if (!prod) return { completados: 0, enProceso: 0, pendientes: 0 };

    const porEstado = prod.porEstado ?? {};
    return {
      completados: porEstado['COMPLETADO'] ?? 0,
      enProceso: porEstado['EN_PROCESO'] ?? 0,
      pendientes: porEstado['PLANIFICADO'] ?? 0
    };
  });

  readonly alertasInventario = computed(() => {
    const stock = this.resumen()?.stockBajo;
    if (!stock || !stock.items) return [];

    return stock.items.map(item => ({
      nombre: item.nombre,
      disponible: item.disponible,
      minimo: item.minimo,
      nivel: item.nivel === 'AGOTADO' ? 'CRITICO' as const : 'BAJO' as const
    }));
  });

  constructor() {
    this.cargarResumen();
    this.cargarVencimientos();
    this.cargarConteos();
    this.cargarPlanes();

    fromEvent(document, 'visibilitychange')
      .pipe(
        filter(() => document.visibilityState === 'visible'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.recargar());
  }

  recargar(): void {
    this.cargarResumen();
    this.cargarVencimientos();
    this.cargarConteos();
    this.cargarPlanes();
  }

  private cargarPlanes(): void {
    this.dashboardService
      .planes({ size: 5, sort: 'fechaProduccion,desc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(planes => this.ultimosPlanes.set(planes));
  }

  private cargarConteos(): void {
    this.cargandoConteos.set(true);
    this.dashboardService
      .conteos()
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.cargandoConteos.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(conteos => {
        if (conteos) {
          this.conteos.set(conteos);
        }
      });
  }

  cargarResumen(): void {
    this.cargandoResumen.set(true);
    this.errorResumen.set(false);

    this.dashboardService
      .resumen()
      .pipe(
        catchError(() => {
          this.errorResumen.set(true);
          return of(null);
        }),
        finalize(() => this.cargandoResumen.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(resumen => {
        if (resumen) {
          this.resumen.set(resumen);
          this.actualizadoEn.set(new Date());
          // El rango del gráfico depende de la fecha del servidor (R-01).
          this.cargarPlanesSemana();
        }
      });
  }

  private cargarPlanesSemana(): void {
    const hasta = this.fechaMostrada();
    const desde = new Date(hasta);
    desde.setDate(desde.getDate() - 6);

    this.dashboardService
      .planes({ size: 100, fechaInicio: aFechaIso(desde), fechaFin: aFechaIso(hasta) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(planes => this.planesSemana.set(planes));
  }

  cargarVencimientos(): void {
    this.cargandoVencimientos.set(true);
    this.errorVencimientos.set(false);

    this.dashboardService
      .vencimientos()
      .pipe(
        catchError(() => {
          this.errorVencimientos.set(true);
          return of(null);
        }),
        finalize(() => this.cargandoVencimientos.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(porVencer => {
        if (porVencer) {
          this.porVencer.set(porVencer);
          this.actualizadoEn.set(new Date());
        }
      });
  }
}
