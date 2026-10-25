import { Component, computed, input } from '@angular/core';

export interface PlanesEstado {
  completados: number;
  enProceso: number;
  pendientes: number;
}

@Component({
  selector: 'app-planes-donut',
  standalone: true,
  imports: [],
  templateUrl: './planes-donut.component.html',
  styleUrl: './planes-donut.component.scss'
})
export class PlanesDonutComponent {
  readonly datos = input<PlanesEstado | null>(null);

  readonly total = computed(() => {
    const d = this.datos();
    if (!d) return 0;
    return d.completados + d.enProceso + d.pendientes;
  });

  readonly segmentos = computed(() => {
    const d = this.datos();
    if (!d || this.total() === 0) return [];

    const segmentos: { color: string; label: string; value: number; pct: number }[] = [];

    if (d.completados > 0) {
      segmentos.push({ color: 'var(--verde-500)', label: 'Completado', value: d.completados, pct: Math.round((d.completados / this.total()) * 100) });
    }
    if (d.enProceso > 0) {
      segmentos.push({ color: 'var(--azul-500)', label: 'En proceso', value: d.enProceso, pct: Math.round((d.enProceso / this.total()) * 100) });
    }
    if (d.pendientes > 0) {
      segmentos.push({ color: 'var(--naranja-500)', label: 'Pendiente', value: d.pendientes, pct: Math.round((d.pendientes / this.total()) * 100) });
    }

    return segmentos;
  });

  readonly conicGradient = computed(() => {
    const segs = this.segmentos();
    if (segs.length === 0) return 'var(--superficie-suave)';

    let angle = 0;
    const parts: string[] = [];

    for (const seg of segs) {
      const nextAngle = angle + (seg.pct / 100) * 360;
      parts.push(`${seg.color} ${angle}deg ${nextAngle}deg`);
      angle = nextAngle;
    }

    return `conic-gradient(${parts.join(', ')})`;
  });
}