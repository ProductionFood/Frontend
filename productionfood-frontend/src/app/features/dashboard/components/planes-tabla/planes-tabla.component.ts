import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { TarjetaTablaComponent } from '../../../../shared/components/tarjeta-tabla/tarjeta-tabla.component';
import { EstadoBadgeComponent } from '../../../../shared/components/estado-badge/estado-badge.component';

export interface PlanReciente {
  idPlanProduccion: number;
  producto: string;
  fechaProduccion: string;
  fechaFin: string;
  estado: string;
  cantidad: number;
}

@Component({
  selector: 'app-planes-tabla',
  standalone: true,
  imports: [DatePipe, MatTableModule, MatButtonModule, MatIconModule, RouterLink, TarjetaTablaComponent, EstadoBadgeComponent],
  templateUrl: './planes-tabla.component.html',
  styleUrl: './planes-tabla.component.scss'
})
export class PlanesTablaComponent {
  readonly datos = input.required<PlanReciente[]>();

  readonly columnas = ['numero', 'producto', 'fecha', 'fechaFin', 'estado', 'cantidad', 'acciones'];

  textoEstado(estado: string): string {
    switch (estado) {
      case 'COMPLETADO': return 'Completado';
      case 'EN_PROCESO': return 'En proceso';
      case 'PLANIFICADO': return 'Planificado';
      case 'CANCELADO': return 'Cancelado';
      default: return estado;
    }
  }

  tonoEstado(estado: string): 'completado' | 'proceso' | 'pendiente' | 'peligro' {
    switch (estado) {
      case 'COMPLETADO': return 'completado';
      case 'EN_PROCESO': return 'proceso';
      case 'PLANIFICADO': return 'pendiente';
      case 'CANCELADO': return 'peligro';
      default: return 'pendiente';
    }
  }
}