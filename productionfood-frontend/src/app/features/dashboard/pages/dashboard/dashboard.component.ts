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
import { ProduccionChartComponent } from '../../components/produccion-chart/produccion-chart.component';
import { PlanesDonutComponent } from '../../components/planes-donut/planes-donut.component';
import { PlanesTablaComponent } from '../../components/planes-tabla/planes-tabla.component';
import { AlertasInventarioComponent } from '../../components/alertas-inventario/alertas-inventario.component';
import { ConteosDashboard, DashboardResumen, ResumenPorVencer } from '../../models/dashboard.model';
import { DashboardService } from '../../services/dashboard.service';

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

  readonly produccionChart = computed(() => {
    const res = this.resumen();
    if (!res) return [];

    const hoy = this.fechaMostrada();
    const dias: { fecha: string; planificada: number; producida: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const fechaStr = d.toISOString().split('T')[0];

      const base = 50 + (i * 10);
      dias.push({
        fecha: fechaStr,
        planificada: base + (i * 5),
        producida: base + (i * 3)
      });
    }

    return dias;
  });

  readonly planesRecientes = computed(() => {
    const prod = this.resumen()?.produccionHoy;
    if (!prod || prod.cantidad === 0) return [];

    return Array.from({ length: Math.min(5, prod.cantidad) }, (_, i) => ({
      idPlanProduccion: i + 1,
      producto: `Producto ${i + 1}`,
      fechaProduccion: this.resumen()?.fecha ?? new Date().toISOString().split('T')[0],
      fechaFin: this.resumen()?.fecha ?? new Date().toISOString().split('T')[0],
      estado: ['PLANIFICADO', 'EN_PROCESO', 'COMPLETADO', 'PENDIENTE'][i % 4],
      cantidad: 100 + i * 50
    }));
  });

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
        }
      });
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
