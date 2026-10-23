import { Component, Input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
@Component({ selector: 'app-semaforo-vencimiento', standalone: true, imports: [MatChipsModule], template: `<mat-chip-set><mat-chip [class]="clase" [attr.aria-label]="etiqueta">{{ etiqueta }}</mat-chip></mat-chip-set>`, styles: [`mat-chip.vencido { --mat-chip-elevated-container-color: #fee2e2; --mat-chip-label-text-color: #991b1b; } mat-chip.urgente { --mat-chip-elevated-container-color: #ffedd5; --mat-chip-label-text-color: #9a3412; } mat-chip.proximo { --mat-chip-elevated-container-color: #fef9c3; --mat-chip-label-text-color: #854d0e; } mat-chip.vigente { --mat-chip-elevated-container-color: #dcfce7; --mat-chip-label-text-color: #166534; }`] })
export class SemaforoVencimientoComponent {
  @Input({ required: true }) fechaVencimiento = '';
  get dias(): number { const hoy = new Date(); hoy.setHours(0,0,0,0); const fecha = new Date(`${this.fechaVencimiento}T00:00:00`); return Math.round((fecha.getTime()-hoy.getTime())/86400000); }
  get clase(): string { return this.dias < 0 ? 'vencido' : this.dias <= 3 ? 'urgente' : this.dias <= 7 ? 'proximo' : 'vigente'; }
  get etiqueta(): string { return this.dias < 0 ? `Vencido hace ${-this.dias} d` : this.dias === 0 ? 'Vence hoy' : this.dias <= 7 ? `Vence en ${this.dias} d` : 'Vigente'; }
}
