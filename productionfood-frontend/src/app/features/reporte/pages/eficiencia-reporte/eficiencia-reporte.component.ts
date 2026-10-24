import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { catchError, finalize, forkJoin, of } from 'rxjs';

import { DesviacionMpChartComponent } from '../../components/desviacion-mp-chart/desviacion-mp-chart.component';
import { MetricasCardsComponent } from '../../components/metricas-cards/metricas-cards.component';
import { PlanEficienciaTablaComponent } from '../../components/plan-eficiencia-tabla/plan-eficiencia-tabla.component';
import {
  DesviacionMateriaPrima,
  FiltroEficiencia,
  ReporteEficiencia
} from '../../models/eficiencia.model';
import { EficienciaService } from '../../services/eficiencia.service';

/**
 * Reporte de eficiencia de producción (HU-26). Solo lectura. El período por
 * defecto es el mes en curso (CA-04) y las dos consultas se lanzan en
 * paralelo: si falla la desviación por insumo, el reporte sigue visible.
 */
@Component({
  selector: 'app-eficiencia-reporte',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    RouterLink,
    MetricasCardsComponent,
    DesviacionMpChartComponent,
    PlanEficienciaTablaComponent
  ],
  templateUrl: './eficiencia-reporte.component.html',
  styleUrl: './eficiencia-reporte.component.scss'
})
export class EficienciaReporteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly eficienciaService = inject(EficienciaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mesPorDefecto = this.rangoMesActual();
  readonly filtros = this.crearFiltros();

  readonly reporte = signal<ReporteEficiencia | null>(null);
  readonly desviacion = signal<DesviacionMateriaPrima[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly errorDesviacion = signal(false);
  readonly errorRango = signal(false);

  constructor() {
    this.filtros.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());

    this.cargar();
  }

  recargar(): void {
    this.cargar();
  }

  private aplicarFiltros(): void {
    const { desde, hasta } = this.filtros.getRawValue();

    if (desde && hasta && desde.getTime() > hasta.getTime()) {
      this.errorRango.set(true);
      return;
    }

    this.errorRango.set(false);
    this.cargar();
  }

  private cargar(): void {
    const periodo = this.periodoApi();
    this.cargando.set(true);
    this.error.set(null);
    this.errorDesviacion.set(false);

    forkJoin({
      reporte: this.eficienciaService.reporte(periodo).pipe(
        catchError((error: HttpErrorResponse) => {
          const cuerpo = error.error as { code?: string; message?: string } | null;

          if (cuerpo?.code === 'RANGO_FECHAS_INVALIDO') {
            this.errorRango.set(true);
          } else {
            this.error.set(
              cuerpo?.message ?? 'No se pudo cargar el reporte de eficiencia.'
            );
          }

          return of(null);
        })
      ),
      desviacion: this.eficienciaService
        .desviacionMateriasPrimas(periodo)
        .pipe(
          catchError(() => {
            this.errorDesviacion.set(true);
            return of(null);
          })
        )
    })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ reporte, desviacion }) => {
        if (reporte) {
          this.reporte.set(reporte);
        }

        this.desviacion.set(desviacion ?? []);
      });
  }

  private periodoApi(): FiltroEficiencia {
    const { desde, hasta } = this.filtros.getRawValue();

    return {
      fechaInicio: this.aFechaApi(desde),
      fechaFin: this.aFechaApi(hasta)
    };
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

  private crearFiltros() {
    return this.fb.group({
      desde: this.fb.control<Date | null>(this.mesPorDefecto.desde),
      hasta: this.fb.control<Date | null>(this.mesPorDefecto.hasta)
    });
  }
}
