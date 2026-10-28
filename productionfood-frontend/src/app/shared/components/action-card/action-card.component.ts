import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { SiRolDirective } from '../../directives/si-rol.directive';
import { RolNombre } from '../../../features/usuario/models/usuario.model';

export type VarianteBoton = 'text' | 'filled' | 'elevated' | 'outlined' | 'tonal';
export type ColorBoton = 'primary' | 'accent' | 'warn';

export interface AccionTarjeta {
  label: string;
  icono: string;
  ruta?: string;
  handler?: () => void;
  roles?: RolNombre[];
  variante?: VarianteBoton;
  color?: ColorBoton;
  deshabilitado?: boolean;
  tooltip?: string;
  clase?: string;
  /** Si es `true`, solo se muestra el icono (sin etiqueta de texto). */
  soloIcono?: boolean;
}

@Component({
  selector: 'app-action-card',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, SiRolDirective],
  templateUrl: './action-card.component.html',
  styleUrl: './action-card.component.scss'
})
export class ActionCardComponent {
  readonly acciones = input.required<AccionTarjeta[]>();
}