import { Component, computed, input } from '@angular/core';

export interface ProduccionDia {
  fecha: string;
  planificada: number;
  producida: number;
}

@Component({
  selector: 'app-produccion-chart',
  standalone: true,
  imports: [],
  templateUrl: './produccion-chart.component.html',
  styleUrl: './produccion-chart.component.scss'
})
export class ProduccionChartComponent {
  readonly datos = input.required<ProduccionDia[]>();

  readonly maxValor = computed(() => {
    const valores = this.datos().flatMap(d => [d.planificada, d.producida]);
    return Math.max(1, ...valores);
  });

  altoPlanificada(dia: ProduccionDia): number {
    return Math.max(4, (dia.planificada / this.maxValor()) * 100);
  }

  altoProducida(dia: ProduccionDia): number {
    return Math.max(4, (dia.producida / this.maxValor()) * 100);
  }

  etiquetaDia(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
  }
}