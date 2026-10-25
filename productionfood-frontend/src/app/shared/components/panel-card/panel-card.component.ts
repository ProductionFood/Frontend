import { Component, input } from '@angular/core';

/**
 * Panel con cabecera (guía §03b): título display-m y criterio opcional.
 * El contenido se proyecta debajo.
 */
@Component({
  selector: 'app-panel-card',
  standalone: true,
  templateUrl: './panel-card.component.html',
  styleUrl: './panel-card.component.scss'
})
export class PanelCardComponent {
  readonly titulo = input.required<string>();
  readonly criterio = input<string | null>(null);
}
