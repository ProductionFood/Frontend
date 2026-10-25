import { Component, input } from '@angular/core';

import { KpiCardComponent } from '../kpi-card/kpi-card.component';

/**
 * Fila de KPI para catálogos maestros (total, activos, inactivos).
 * Los conteos los calcula cada página con consultas ligeras al backend.
 */
@Component({
  selector: 'app-kpis-catalogo',
  standalone: true,
  imports: [KpiCardComponent],
  template: `
    <section class="kpis" aria-label="Resumen del catálogo">
      <app-kpi-card
        [etiqueta]="etiquetaTotal()"
        [valor]="cargando() ? '—' : total()"
        [icono]="icono()"
      />
      <app-kpi-card
        [etiqueta]="etiquetaActivos()"
        [valor]="cargando() ? '—' : activos()"
        icono="check_circle"
        tono="azul"
        tonoValor="azul"
      />
      <app-kpi-card
        [etiqueta]="etiquetaInactivos()"
        [valor]="cargando() ? '—' : inactivos()"
        icono="block"
        tono="naranja"
        tonoValor="naranja"
      />
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 20px;
      }

      .kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 17px;
      }

      @media (max-width: 1100px) {
        .kpis {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 720px) {
        .kpis {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class KpisCatalogoComponent {
  readonly total = input(0);
  readonly activos = input(0);
  readonly inactivos = input(0);
  readonly cargando = input(false);
  readonly icono = input('category');
  readonly etiquetaTotal = input('Total');
  readonly etiquetaActivos = input('Activos');
  readonly etiquetaInactivos = input('Inactivos');
}
