import { Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoteConsumido } from '../../models/pedido.model';

@Component({
  selector: 'app-lotes-consumidos-chip',
  standalone: true,
  imports: [MatChipsModule, MatIconModule, MatTooltipModule],
  template: `
    <mat-chip-set aria-label="Lotes consumidos">
      @for (l of lotes(); track l.codigoLote) {
        <mat-chip [matTooltip]="'Vence: ' + l.vence">
          {{ l.codigoLote }} ({{ l.cantidad }})
          @if (dias(l.vence) <= 3) {
            <mat-icon
              class="aviso"
              aria-label="Próximo a vencer"
              matTooltip="Próximo a vencer"
            >schedule</mat-icon>
          }
        </mat-chip>
      }
    </mat-chip-set>
  `,
  styles: [
    `
      .aviso {
        width: var(--icono-sm);
        height: var(--icono-sm);
        font-size: var(--icono-sm);
        color: var(--aviso-texto);
        vertical-align: middle;
      }
    `
  ]
})
export class LotesConsumidosChipComponent {
  readonly lotes = input<LoteConsumido[]>([]);

  dias(fecha: string): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.ceil(
      (new Date(`${fecha}T00:00:00`).getTime() - hoy.getTime()) / 86400000
    );
  }
}
