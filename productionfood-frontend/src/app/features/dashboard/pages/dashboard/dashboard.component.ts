import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, filter, finalize, fromEvent, of } from 'rxjs';

import { SiRolDirective } from '../../../../shared/directives/si-rol.directive';
import { TarjetaComprasComponent } from '../../components/tarjeta-compras/tarjeta-compras.component';
import { TarjetaPedidosComponent } from '../../components/tarjeta-pedidos/tarjeta-pedidos.component';
import { TarjetaProduccionComponent } from '../../components/tarjeta-produccion/tarjeta-produccion.component';
import { TarjetaStockComponent } from '../../components/tarjeta-stock/tarjeta-stock.component';
import { TarjetaVencimientosComponent } from '../../components/tarjeta-vencimientos/tarjeta-vencimientos.component';
import { DashboardResumen, ResumenPorVencer } from '../../models/dashboard.model';
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
    SiRolDirective,
    TarjetaComprasComponent,
    TarjetaPedidosComponent,
    TarjetaProduccionComponent,
    TarjetaStockComponent,
    TarjetaVencimientosComponent
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

  constructor() {
    this.cargarResumen();
    this.cargarVencimientos();

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
