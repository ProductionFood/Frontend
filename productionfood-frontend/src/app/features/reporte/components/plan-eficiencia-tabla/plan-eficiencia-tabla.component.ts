import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EstadoPlan } from '../../../produccion/models/plan-produccion.model';
import { PlanEficiencia } from '../../models/eficiencia.model';
import { PanelCardComponent } from '../../../../shared/components/panel-card/panel-card.component';

/**
 * Tabla de planes del período (HU-26). Muestra las tres métricas por separado
 * (R-01), con `—` y tooltip donde el cálculo dio `null` (R-03). Al expandir,
 * expone productos (CA-01) y consumos teóricos vs reales (CA-02). El detalle
 * ya viene en la respuesta del reporte: no hay petición por fila.
 */
@Component({
  selector: 'app-plan-eficiencia-tabla',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatIconModule, MatTableModule, MatTooltipModule, PanelCardComponent],
  templateUrl: './plan-eficiencia-tabla.component.html',
  styleUrl: './plan-eficiencia-tabla.component.scss'
})
export class PlanEficienciaTablaComponent {
  readonly planes = input.required<PlanEficiencia[]>();

  readonly columnas = [
    'expand',
    'idPlan',
    'fechaProduccion',
    'responsable',
    'cumplimiento',
    'rendimiento',
    'rendimientoAjustado',
    'estado'
  ];

  readonly expandidos = signal<Set<number>>(new Set());

  readonly tooltipRendimiento =
    'No se puede calcular: algún consumo del plan tiene cantidad real en cero (R-03).';

  readonly tooltipAjustado =
    'No se puede calcular: falta consumo real o cantidad producida en el plan.';

  esExpandida(idPlan: number): boolean {
    return this.expandidos().has(idPlan);
  }

  alternar(idPlan: number): void {
    const expandidos = new Set(this.expandidos());

    if (expandidos.has(idPlan)) {
      expandidos.delete(idPlan);
    } else {
      expandidos.add(idPlan);
    }

    this.expandidos.set(expandidos);
  }

  textoEstado(estado: EstadoPlan): string {
    switch (estado) {
      case 'PLANIFICADO':
        return 'Planificado';
      case 'EN_PROCESO':
        return 'En proceso';
      case 'COMPLETADO':
        return 'Completado';
      case 'CANCELADO':
        return 'Cancelado';
    }
  }

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
