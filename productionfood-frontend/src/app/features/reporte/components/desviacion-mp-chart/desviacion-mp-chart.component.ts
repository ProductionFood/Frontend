import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DesviacionMateriaPrima } from '../../models/eficiencia.model';
import { PanelCardComponent } from '../../../../shared/components/panel-card/panel-card.component';

/**
 * Barras divergentes de desviación acumulada por materia prima (HU-26 R-06).
 * Se ordenan por magnitud: arriba queda lo que hay que revisar. El signo y la
 * etiqueta acompañan al color para no depender solo de él.
 */
@Component({
  selector: 'app-desviacion-mp-chart',
  standalone: true,
  imports: [DecimalPipe, MatTooltipModule, PanelCardComponent],
  templateUrl: './desviacion-mp-chart.component.html',
  styleUrl: './desviacion-mp-chart.component.scss'
})
export class DesviacionMpChartComponent {
  readonly datos = input.required<DesviacionMateriaPrima[]>();

  readonly ordenadas = computed(() =>
    [...this.datos()].sort(
      (a, b) => Math.abs(b.desviacion ?? 0) - Math.abs(a.desviacion ?? 0)
    )
  );

  readonly maximo = computed(() => {
    const valores = this.datos().map(fila => Math.abs(fila.desviacion ?? 0));

    return Math.max(1, ...valores);
  });

  ancho(desviacion: number | null): number {
    return Math.max(2, Math.min(100, (Math.abs(desviacion ?? 0) / this.maximo()) * 100));
  }

  signo(desviacion: number | null): string {
    if (desviacion === null || desviacion === 0) {
      return '';
    }

    return desviacion > 0 ? '+' : '−';
  }

  absoluto(desviacion: number | null): number {
    return desviacion === null ? 0 : Math.abs(desviacion);
  }

  clase(desviacion: number | null): 'exceso' | 'ahorro' | 'normal' {
    if (desviacion === null || desviacion === 0) {
      return 'normal';
    }

    return desviacion > 0 ? 'exceso' : 'ahorro';
  }
}
