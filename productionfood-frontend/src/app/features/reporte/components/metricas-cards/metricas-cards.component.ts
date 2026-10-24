import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ResumenEficiencia } from '../../models/eficiencia.model';

/**
 * Tarjetas del reporte (HU-26). Cada métrica lleva una frase que explica el
 * número (R-01): cumplimiento y rendimiento responden a preguntas distintas y
 * nunca se promedian entre sí. Los valores `null` se muestran como `—` (R-03).
 */
@Component({
  selector: 'app-metricas-cards',
  standalone: true,
  imports: [DecimalPipe, MatCardModule, MatIconModule, MatTooltipModule],
  templateUrl: './metricas-cards.component.html',
  styleUrl: './metricas-cards.component.scss'
})
export class MetricasCardsComponent {
  readonly resumen = input.required<ResumenEficiencia>();

  readonly ayudaAjustado =
    'El consumo teórico se calcula sobre lo planificado, no sobre lo producido ' +
    '(HU-22 R-02). El ajustado corrige ese sesgo multiplicando el teórico por ' +
    'producido / planificado: es la única métrica comparable entre planes.';

  /** R-02: prepara la frase del ajustado sin que el template haga cuentas. */
  readonly ajustado = computed(() => {
    const valor = this.resumen().rendimientoAjustadoPromedio;

    if (valor === null) {
      return null;
    }

    const diferencia = Math.abs(100 - valor);

    return {
      valor,
      diferencia,
      texto: diferencia < 0.05 ? 'exactamente lo previsto' : `${valor >= 100 ? 'menos' : 'más'} de lo previsto`
    };
  });

  signo(valor: number | null): string {
    if (valor === null || valor === 0) {
      return '';
    }

    return valor > 0 ? '+' : '−';
  }

  absoluto(valor: number | null): number {
    return valor === null ? 0 : Math.abs(valor);
  }
}
