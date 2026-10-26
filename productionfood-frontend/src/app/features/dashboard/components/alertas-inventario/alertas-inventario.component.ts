import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface AlertaInventario {
  nombre: string;
  disponible: number;
  minimo: number;
  nivel: 'CRITICO' | 'BAJO' | 'OK';
}

@Component({
  selector: 'app-alertas-inventario',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './alertas-inventario.component.html',
  styleUrl: './alertas-inventario.component.scss'
})
export class AlertasInventarioComponent {
  readonly datos = input<AlertaInventario[] | null>(null);

  readonly items = computed(() => {
    const d = this.datos();
    if (!d) return [];
    return d.sort((a, b) => {
      const orden = { CRITICO: 0, BAJO: 1, OK: 2 };
      return orden[a.nivel] - orden[b.nivel];
    });
  });

  iconoNivel(nivel: string): string {
    switch (nivel) {
      case 'CRITICO': return 'error';
      case 'BAJO': return 'warning';
      case 'OK': return 'check_circle';
      default: return 'help';
    }
  }

  claseIcono(nivel: string): string {
    return `alert-icon ${nivel.toLowerCase()}`;
  }

  claseValor(nivel: string): string {
    return `alert-value ${nivel.toLowerCase()}`;
  }
}